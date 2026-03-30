import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/shared/auth/authOptions'
import { ApiResponse } from '@/shared/types'

/**
 * Session context extracted from JWT
 */
export interface AuthSession {
  user: {
    id: string
    email: string
    name?: string
    tenantId: string
  }
  tenant: {
    id: string
    slug: string
    plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  }
  permissions: string[]
}

/**
 * Gets server session with tenant and permission info
 */
export async function getServerSessionWithAuth(): Promise<AuthSession | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return null
    }

    // In production, permissions would be fetched from database
    // For now, we return empty array and rely on permission checks
    return {
      user: {
        id: (session.user as any).id || '',
        email: session.user.email || '',
        name: session.user.name ?? undefined,
        tenantId: (session.user as any).tenantId || '',
      },
      tenant: {
        id: (session.user as any).tenantId || '',
        slug: (session as any).tenant?.slug || '',
        plan: (session as any).tenant?.plan || 'STARTER',
      },
      permissions: (session as any).permissions || [],
    }
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}

/**
 * Validates that user has required permissions
 * Permission format: "resource.action" (e.g., "proposal.create", "customer.read")
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  if (requiredPermissions.length === 0) {
    return true
  }

  // User needs ALL required permissions
  return requiredPermissions.every((required) => {
    // Check for exact match
    if (userPermissions.includes(required)) {
      return true
    }

    // Check for wildcard (e.g., "proposal.*" or "*")
    const resourceAction = required.split('.')
    if (resourceAction.length === 2) {
      const [resource, action] = resourceAction
      // Check resource.* permission
      if (userPermissions.includes(`${resource}.*`)) {
        return true
      }
      // Check * permission (admin)
      if (userPermissions.includes('*')) {
        return true
      }
    }

    return false
  })
}

/**
 * Higher-order function that wraps API handlers with auth middleware
 * Verifies session and checks permissions
 */
export function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  requiredPermissions: string[] = [],
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      const session = await getServerSessionWithAuth()

      // Check authentication
      if (!session) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          },
          { status: 401 },
        )
      }

      // Check permissions
      if (requiredPermissions.length > 0) {
        if (!hasPermission(session.permissions, requiredPermissions)) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
              },
            },
            { status: 403 },
          )
        }
      }

      // Attach session to request for handler to use
      ;(request as any).session = session

      return await handler(request, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
        },
        { status: 500 },
      )
    }
  }
}

/**
 * Gets session from request (set by withAuth middleware)
 */
export function getSessionFromRequest(request: NextRequest): AuthSession | null {
  return (request as any).session || null
}
