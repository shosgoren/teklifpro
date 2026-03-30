import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { getServerSessionWithAuth } from './authMiddleware'
import { ApiResponse } from '@/shared/types'

interface RateLimitOptions {
  /**
   * Custom requests per minute limit
   */
  requestsPerMinute?: number
  /**
   * Skip rate limiting for certain conditions
   */
  skip?: (request: NextRequest) => boolean
}

/**
 * Plan-based rate limits (requests per minute)
 */
const PLAN_LIMITS = {
  STARTER: 100,
  PROFESSIONAL: 500,
  ENTERPRISE: 2000,
}

/**
 * Initialize Redis and Ratelimit
 */
function initializeRateLimit(): Ratelimit | null {
  try {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      console.warn('Upstash Redis credentials not configured')
      return null
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, '1 m'), // Will be customized per plan
      analytics: true,
      prefix: 'teklifpro:ratelimit',
    })
  } catch (error) {
    console.error('Failed to initialize rate limit:', error)
    return null
  }
}

let rateLimitInstance: Ratelimit | null = null

function getRateLimitInstance(): Ratelimit | null {
  if (!rateLimitInstance) {
    rateLimitInstance = initializeRateLimit()
  }
  return rateLimitInstance
}

/**
 * Gets rate limit for tenant based on plan
 */
function getRateLimitForPlan(
  plan: string,
  customLimit?: number,
): number {
  if (customLimit) {
    return customLimit
  }

  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.STARTER
}

/**
 * Creates rate limit key for tenant
 */
function getRateLimitKey(tenantId: string): string {
  return `tenant:${tenantId}`
}

/**
 * Higher-order function that wraps API handlers with rate limiting
 * Uses tenant-based rate limiting (not per-user)
 */
export function withRateLimit(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: RateLimitOptions = {},
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Skip rate limiting in development
      if (process.env.NODE_ENV === 'development') {
        return await handler(request, context)
      }

      // Allow custom skip logic
      if (options.skip && options.skip(request)) {
        return await handler(request, context)
      }

      const session = await getServerSessionWithAuth()

      // If no session, apply default STARTER limit
      if (!session) {
        // For unauthenticated requests, use IP-based rate limiting
        const ip =
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown'

        const rateLimiter = getRateLimitInstance()
        if (rateLimiter) {
          const limit = getRateLimitForPlan(
            'STARTER',
            options.requestsPerMinute,
          )
          const response = await rateLimiter.limit(ip)

          if (!response.success) {
            return NextResponse.json<ApiResponse>(
              {
                success: false,
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests. Please try again later.',
                },
              },
              {
                status: 429,
                headers: {
                  'Retry-After': Math.ceil(
                    (response.reset ?? 0) / 1000,
                  ).toString(),
                  'X-RateLimit-Limit': limit.toString(),
                  'X-RateLimit-Remaining': Math.max(
                    0,
                    response.remaining ?? 0,
                  ).toString(),
                  'X-RateLimit-Reset': new Date(
                    response.reset ?? 0,
                  ).toISOString(),
                },
              },
            )
          }
        }

        return await handler(request, context)
      }

      // Apply tenant-based rate limiting
      const rateLimiter = getRateLimitInstance()
      if (rateLimiter) {
        const limit = getRateLimitForPlan(
          session.tenant.plan,
          options.requestsPerMinute,
        )
        const key = getRateLimitKey(session.tenant.id)

        // Create a sliding window limiter for this specific limit
        const tenantLimiter = new Ratelimit({
          redis: (rateLimiter as any).redis,
          limiter: Ratelimit.slidingWindow(limit, '1 m'),
          analytics: true,
          prefix: `teklifpro:ratelimit:${session.tenant.plan}`,
        })

        const response = await tenantLimiter.limit(key)

        if (!response.success) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Rate limit exceeded. Your plan allows ${limit} requests per minute.`,
              },
            },
            {
              status: 429,
              headers: {
                'Retry-After': Math.ceil(
                  (response.reset ?? 0) / 1000,
                ).toString(),
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': Math.max(
                  0,
                  response.remaining ?? 0,
                ).toString(),
                'X-RateLimit-Reset': new Date(
                  response.reset ?? 0,
                ).toISOString(),
              },
            },
          )
        }

        // Attach rate limit info to response
        ;(request as any).rateLimitInfo = {
          limit,
          remaining: response.remaining ?? 0,
          reset: response.reset,
        }
      }

      return await handler(request, context)
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      // Don't block request if rate limiting fails
      return await handler(request, context)
    }
  }
}

/**
 * Gets rate limit info from request (set by withRateLimit middleware)
 */
export function getRateLimitInfoFromRequest(
  request: NextRequest,
): { limit: number; remaining: number; reset: number } | null {
  return (request as any).rateLimitInfo || null
}
