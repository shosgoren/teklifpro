import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getSessionFromRequest, hasPermission } from './authMiddleware'
import {
  withRateLimit,
  getRateLimitInfoFromRequest,
} from './rateLimitMiddleware'
import { ApiResponse } from '@/shared/types'
import { prisma } from '@/shared/utils/prisma'

interface CreateApiHandlerOptions {
  /**
   * Required permissions for this endpoint
   * Format: "resource.action" (e.g., "proposal.create")
   */
  permissions?: string[]

  /**
   * Enable rate limiting for this endpoint
   */
  rateLimit?: boolean

  /**
   * Skip authentication (public endpoint)
   */
  public?: boolean

  /**
   * Custom requests per minute limit (overrides plan-based limit)
   */
  requestsPerMinute?: number

  /**
   * Log endpoint access to audit log
   */
  audit?: boolean
}

/**
 * Chains middleware in order: rateLimit -> auth -> permission check -> handler
 * Wraps everything in try-catch with consistent error response
 */
export function createApiHandler(
  handler: (
    request: NextRequest,
    context?: any,
  ) => Promise<NextResponse<ApiResponse>>,
  options: CreateApiHandlerOptions = {},
) {
  const {
    permissions = [],
    rateLimit = true,
    public: isPublic = false,
    requestsPerMinute,
    audit = false,
  } = options

  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Chain 1: Rate limiting (if enabled)
      let limitedHandler: (request: NextRequest, context?: any) => Promise<NextResponse> = handler as any
      if (rateLimit) {
        limitedHandler = withRateLimit(handler as any, { requestsPerMinute })
      }

      // Chain 2: Authentication (unless public)
      let authHandler = limitedHandler
      if (!isPublic) {
        authHandler = withAuth(limitedHandler, permissions)
      } else {
        authHandler = limitedHandler
      }

      // Chain 3: Execute handler
      const response = await authHandler(request, context)

      // Chain 4: Audit logging (if enabled and not public)
      if (audit && !isPublic) {
        const session = getSessionFromRequest(request)
        if (session) {
          const method = request.method
          const url = request.nextUrl.pathname
          const statusCode =
            response instanceof NextResponse ? response.status : 200

          // Log asynchronously without blocking response
          logAuditAsync({
            tenantId: session.tenant.id,
            userId: session.user.id,
            action: `${method} ${url}`,
            status: statusCode >= 400 ? 'FAILED' : 'SUCCESS',
            resource: url.split('/').filter(Boolean)[3] || 'unknown', // Extract resource from URL
          }).catch((error) => {
            console.error('Failed to log audit event:', error)
          })
        }
      }

      // Chain 5: Attach rate limit headers if available
      if (rateLimit && response instanceof NextResponse) {
        const rateLimitInfo = getRateLimitInfoFromRequest(request)
        if (rateLimitInfo) {
          response.headers.set(
            'X-RateLimit-Limit',
            rateLimitInfo.limit.toString(),
          )
          response.headers.set(
            'X-RateLimit-Remaining',
            rateLimitInfo.remaining.toString(),
          )
          response.headers.set(
            'X-RateLimit-Reset',
            new Date(rateLimitInfo.reset).toISOString(),
          )
        }
      }

      return response
    } catch (error) {
      console.error('Handler execution error:', error)

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        },
        { status: 500 },
      )
    }
  }
}

/**
 * Logs audit event asynchronously
 */
async function logAuditAsync(data: {
  tenantId: string
  userId: string
  action: string
  status: 'SUCCESS' | 'FAILED'
  resource: string
}): Promise<void> {
  try {
    // Create audit log entry if table exists
    // This is a no-op if AuditLog table doesn't exist yet
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          action: data.action,
          entity: data.resource,
          metadata: { status: data.status },
        },
      })
    } catch (error) {
      // Table might not exist yet, log to console instead
      console.log('[AUDIT]', JSON.stringify(data))
    }
  } catch (error) {
    console.error('Audit logging failed:', error)
  }
}

/**
 * Export middleware functions for direct use
 */
export { withAuth, getSessionFromRequest, hasPermission } from './authMiddleware'
export {
  withRateLimit,
  getRateLimitInfoFromRequest,
} from './rateLimitMiddleware'

/**
 * Example usage:
 *
 * // Public endpoint with rate limiting
 * export const POST = createApiHandler(handleRegister, {
 *   public: true,
 *   rateLimit: true,
 * })
 *
 * // Protected endpoint with permission check
 * export const GET = createApiHandler(handleGetProposals, {
 *   permissions: ['proposal.read'],
 *   rateLimit: true,
 *   audit: true,
 * })
 *
 * // Admin-only endpoint
 * export const DELETE = createApiHandler(handleDelete, {
 *   permissions: ['admin.*'],
 *   rateLimit: true,
 *   audit: true,
 * })
 */
