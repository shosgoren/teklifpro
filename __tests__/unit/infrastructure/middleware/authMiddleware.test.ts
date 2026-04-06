/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Mock dependencies
// ============================================================
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/shared/auth/authOptions', () => ({
  authOptions: {},
}))

jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

// ============================================================
// Imports (after mocks)
// ============================================================
import {
  hasPermission,
  withAuth,
  getServerSessionWithAuth,
  getSessionFromRequest,
  AuthSession,
} from '@/infrastructure/middleware/authMiddleware'
import { getPermissionsForRole, ROLE_PERMISSIONS } from '@/shared/auth/permissions'
import { getServerSession } from 'next-auth/next'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// ============================================================
// Helpers
// ============================================================
function createMockRequest(
  method: string,
  url: string,
  options?: {
    body?: any
    headers?: Record<string, string>
  },
): NextRequest {
  const urlObj = new URL(url, 'http://localhost:3000')

  return new NextRequest(urlObj.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...(options?.body && { body: JSON.stringify(options.body) }),
  })
}

const MOCK_SESSION = {
  user: {
    id: 'user-test-123',
    email: 'test@example.com',
    name: 'Test User',
    tenantId: 'tenant-test-123',
    role: 'ADMIN',
  },
  tenant: {
    slug: 'test-company',
    plan: 'PROFESSIONAL',
  },
}

// ============================================================
// TEST SUITE: hasPermission
// ============================================================
describe('hasPermission', () => {
  describe('empty permissions', () => {
    it('should return true when required permissions array is empty', () => {
      expect(hasPermission(['proposal.read'], [])).toBe(true)
    })

    it('should return true when both user and required permissions are empty', () => {
      expect(hasPermission([], [])).toBe(true)
    })

    it('should return false when user has no permissions but some are required', () => {
      expect(hasPermission([], ['proposal.read'])).toBe(false)
    })
  })

  describe('exact match', () => {
    it('should return true for single exact permission match', () => {
      expect(hasPermission(['proposal.read'], ['proposal.read'])).toBe(true)
    })

    it('should return true when user has superset of required permissions', () => {
      expect(
        hasPermission(
          ['proposal.read', 'customer.read', 'product.read'],
          ['proposal.read', 'customer.read'],
        ),
      ).toBe(true)
    })

    it('should return false when a required permission is missing', () => {
      expect(hasPermission(['proposal.read'], ['proposal.create'])).toBe(false)
    })
  })

  describe('requires ALL permissions (not just one)', () => {
    it('should return false when only some required permissions are present', () => {
      expect(
        hasPermission(
          ['proposal.read', 'customer.read'],
          ['proposal.read', 'proposal.create'],
        ),
      ).toBe(false)
    })

    it('should return true only when all required permissions are satisfied', () => {
      expect(
        hasPermission(
          ['proposal.read', 'proposal.create', 'customer.read'],
          ['proposal.read', 'proposal.create', 'customer.read'],
        ),
      ).toBe(true)
    })
  })

  describe('resource.* wildcard', () => {
    it('should match proposal.* against proposal.read', () => {
      expect(hasPermission(['proposal.*'], ['proposal.read'])).toBe(true)
    })

    it('should match proposal.* against proposal.create', () => {
      expect(hasPermission(['proposal.*'], ['proposal.create'])).toBe(true)
    })

    it('should NOT match proposal.* against customer.read', () => {
      expect(hasPermission(['proposal.*'], ['customer.read'])).toBe(false)
    })

    it('should match multiple resource wildcards against their respective actions', () => {
      expect(
        hasPermission(
          ['proposal.*', 'customer.*'],
          ['proposal.read', 'customer.create'],
        ),
      ).toBe(true)
    })

    it('should return false when resource wildcard covers only some required permissions', () => {
      expect(
        hasPermission(
          ['proposal.*'],
          ['proposal.read', 'customer.create'],
        ),
      ).toBe(false)
    })
  })

  describe('* wildcard (admin/owner)', () => {
    it('should match * against any single permission', () => {
      expect(hasPermission(['*'], ['proposal.read'])).toBe(true)
    })

    it('should match * against multiple permissions', () => {
      expect(
        hasPermission(
          ['*'],
          ['proposal.read', 'customer.create', 'admin.billing'],
        ),
      ).toBe(true)
    })
  })
})

// ============================================================
// TEST SUITE: getPermissionsForRole
// ============================================================
describe('getPermissionsForRole', () => {
  it('OWNER should get ["*"]', () => {
    expect(getPermissionsForRole('OWNER')).toEqual(['*'])
  })

  it('ADMIN should get specific resource wildcards', () => {
    const perms = getPermissionsForRole('ADMIN')
    expect(perms).toContain('proposal.*')
    expect(perms).toContain('customer.*')
    expect(perms).toContain('product.*')
    expect(perms).toContain('bom.*')
    expect(perms).toContain('supplier.*')
    expect(perms).toContain('stock.*')
    expect(perms).toContain('settings.manage')
    expect(perms).toContain('integration.manage')
    expect(perms).toContain('integration.sync')
    expect(perms).toContain('ai.use')
    expect(perms).toContain('audit.read')
  })

  it('USER should get specific CRUD permissions', () => {
    const perms = getPermissionsForRole('USER')
    expect(perms).toContain('proposal.create')
    expect(perms).toContain('proposal.read')
    expect(perms).toContain('proposal.update')
    expect(perms).toContain('proposal.send')
    expect(perms).toContain('proposal.clone')
    expect(perms).toContain('customer.read')
    expect(perms).toContain('customer.create')
    expect(perms).toContain('customer.update')
    expect(perms).toContain('product.read')
    expect(perms).toContain('bom.read')
    expect(perms).toContain('supplier.read')
    expect(perms).toContain('stock.read')
    expect(perms).toContain('ai.use')
  })

  it('USER should NOT have admin-level permissions', () => {
    const perms = getPermissionsForRole('USER')
    expect(perms).not.toContain('settings.manage')
    expect(perms).not.toContain('integration.manage')
    expect(perms).not.toContain('admin.*')
    expect(perms).not.toContain('*')
  })

  it('VIEWER should get read-only permissions', () => {
    const perms = getPermissionsForRole('VIEWER')
    expect(perms).toContain('proposal.read')
    expect(perms).toContain('proposal.send')
    expect(perms).toContain('customer.read')
    expect(perms).toContain('product.read')
    expect(perms).toContain('bom.read')
    expect(perms).toContain('supplier.read')
    expect(perms).toContain('stock.read')
    // Should NOT have write permissions
    expect(perms).not.toContain('proposal.create')
    expect(perms).not.toContain('proposal.update')
    expect(perms).not.toContain('proposal.delete')
    expect(perms).not.toContain('customer.create')
    expect(perms).not.toContain('customer.update')
  })

  it('unknown role should return empty array', () => {
    expect(getPermissionsForRole('UNKNOWN_ROLE')).toEqual([])
  })

  it('empty string role should return empty array', () => {
    expect(getPermissionsForRole('')).toEqual([])
  })
})

// ============================================================
// TEST SUITE: getServerSessionWithAuth
// ============================================================
describe('getServerSessionWithAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return null when getServerSession returns null', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)

    const result = await getServerSessionWithAuth()
    expect(result).toBeNull()
  })

  it('should return null when session has no user', async () => {
    mockGetServerSession.mockResolvedValueOnce({} as any)

    const result = await getServerSessionWithAuth()
    expect(result).toBeNull()
  })

  it('should map session to AuthSession with correct user fields', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION as any)

    const result = await getServerSessionWithAuth()

    expect(result).not.toBeNull()
    expect(result!.user.id).toBe('user-test-123')
    expect(result!.user.email).toBe('test@example.com')
    expect(result!.user.name).toBe('Test User')
    expect(result!.user.tenantId).toBe('tenant-test-123')
    expect(result!.user.role).toBe('ADMIN')
  })

  it('should map session to AuthSession with correct tenant fields', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION as any)

    const result = await getServerSessionWithAuth()

    expect(result!.tenant.id).toBe('tenant-test-123')
    expect(result!.tenant.slug).toBe('test-company')
    expect(result!.tenant.plan).toBe('PROFESSIONAL')
  })

  it('should resolve permissions from the user role', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION as any)

    const result = await getServerSessionWithAuth()

    // ADMIN role should have resource wildcards
    expect(result!.permissions).toContain('proposal.*')
    expect(result!.permissions).toContain('customer.*')
  })

  it('should default to VIEWER role when role is missing', async () => {
    const noRoleSession = {
      ...MOCK_SESSION,
      user: { ...MOCK_SESSION.user, role: undefined },
    }
    mockGetServerSession.mockResolvedValueOnce(noRoleSession as any)

    const result = await getServerSessionWithAuth()

    expect(result!.user.role).toBe('VIEWER')
    expect(result!.permissions).toEqual(ROLE_PERMISSIONS.VIEWER)
  })

  it('should default tenant plan to STARTER when not provided', async () => {
    const noTenantSession = {
      user: {
        id: 'user-1',
        email: 'a@b.com',
        tenantId: 't-1',
        role: 'USER',
      },
    }
    mockGetServerSession.mockResolvedValueOnce(noTenantSession as any)

    const result = await getServerSessionWithAuth()

    expect(result!.tenant.plan).toBe('STARTER')
    expect(result!.tenant.slug).toBe('')
  })

  it('should return null and not throw when getServerSession throws', async () => {
    mockGetServerSession.mockRejectedValueOnce(new Error('connection error'))

    const result = await getServerSessionWithAuth()
    expect(result).toBeNull()
  })
})

// ============================================================
// TEST SUITE: withAuth
// ============================================================
describe('withAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when no session exists', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)

    const handler = jest.fn()
    const wrappedHandler = withAuth(handler)

    const request = { nextUrl: new URL('http://localhost/api/test') } as unknown as NextRequest
    const response = await wrappedHandler(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
    expect(data.error.message).toBe('Authentication required')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should return 403 when user has insufficient permissions', async () => {
    const viewerSession = {
      ...MOCK_SESSION,
      user: { ...MOCK_SESSION.user, role: 'VIEWER' },
    }
    mockGetServerSession.mockResolvedValueOnce(viewerSession as any)

    const handler = jest.fn()
    const wrappedHandler = withAuth(handler, ['proposal.create'])

    const request = createMockRequest('POST', '/api/v1/proposals')
    const response = await wrappedHandler(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
    expect(data.error.message).toContain('proposal.create')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should call handler when session is valid and no permissions required', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION as any)

    const mockResponse = NextResponse.json({ success: true }, { status: 200 })
    const handler = jest.fn().mockResolvedValue(mockResponse)
    const wrappedHandler = withAuth(handler)

    const request = createMockRequest('GET', '/api/v1/proposals')
    const response = await wrappedHandler(request)

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should call handler when user has matching permissions', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION as any)

    const mockResponse = NextResponse.json({ success: true }, { status: 200 })
    const handler = jest.fn().mockResolvedValue(mockResponse)
    // ADMIN has proposal.*
    const wrappedHandler = withAuth(handler, ['proposal.read'])

    const request = createMockRequest('GET', '/api/v1/proposals')
    const response = await wrappedHandler(request)

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should attach session to request object before calling handler', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION as any)

    const mockResponse = NextResponse.json({ success: true }, { status: 200 })
    const handler = jest.fn().mockResolvedValue(mockResponse)
    const wrappedHandler = withAuth(handler)

    const request = createMockRequest('GET', '/api/v1/proposals')
    await wrappedHandler(request)

    const passedRequest = handler.mock.calls[0][0]
    expect((passedRequest as any).session).toBeDefined()
    expect((passedRequest as any).session.user.email).toBe('test@example.com')
    expect((passedRequest as any).session.user.tenantId).toBe('tenant-test-123')
    expect((passedRequest as any).session.permissions).toContain('proposal.*')
  })

  it('should pass context parameter through to handler', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION as any)

    const mockResponse = NextResponse.json({ success: true }, { status: 200 })
    const handler = jest.fn().mockResolvedValue(mockResponse)
    const wrappedHandler = withAuth(handler)

    const request = createMockRequest('GET', '/api/v1/proposals/123')
    const context = { params: { id: '123' } }
    await wrappedHandler(request, context)

    expect(handler).toHaveBeenCalledWith(expect.anything(), context)
  })

  it('should allow OWNER to access any permission-gated handler', async () => {
    const ownerSession = {
      ...MOCK_SESSION,
      user: { ...MOCK_SESSION.user, role: 'OWNER' },
    }
    mockGetServerSession.mockResolvedValueOnce(ownerSession as any)

    const mockResponse = NextResponse.json({ success: true }, { status: 200 })
    const handler = jest.fn().mockResolvedValue(mockResponse)
    const wrappedHandler = withAuth(handler, ['admin.billing', 'settings.manage'])

    const request = createMockRequest('GET', '/api/v1/admin/billing')
    const response = await wrappedHandler(request)

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should return 500 when handler throws an unexpected error', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION as any)

    const handler = jest.fn().mockRejectedValue(new Error('Unexpected error'))
    const wrappedHandler = withAuth(handler)

    const request = createMockRequest('GET', '/api/v1/proposals')
    const response = await wrappedHandler(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })

  it('should default to VIEWER permissions when session role is missing', async () => {
    const noRoleSession = {
      ...MOCK_SESSION,
      user: { ...MOCK_SESSION.user, role: undefined },
    }
    mockGetServerSession.mockResolvedValueOnce(noRoleSession as any)

    const handler = jest.fn()
    const wrappedHandler = withAuth(handler, ['proposal.create'])

    const request = createMockRequest('POST', '/api/v1/proposals')
    const response = await wrappedHandler(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error.code).toBe('FORBIDDEN')
  })
})

// ============================================================
// TEST SUITE: getSessionFromRequest
// ============================================================
describe('getSessionFromRequest', () => {
  it('should return session when set on request', () => {
    const mockSession: AuthSession = {
      user: {
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        tenantId: 'tenant-1',
        role: 'USER',
      },
      tenant: {
        id: 'tenant-1',
        slug: 'test-co',
        plan: 'STARTER',
      },
      permissions: ['proposal.read', 'proposal.create'],
    }

    const request = { nextUrl: new URL('http://localhost/api/test') } as unknown as NextRequest
    ;(request as any).session = mockSession

    const result = getSessionFromRequest(request)

    expect(result).not.toBeNull()
    expect(result!.user.id).toBe('user-1')
    expect(result!.user.email).toBe('test@test.com')
    expect(result!.tenant.slug).toBe('test-co')
    expect(result!.permissions).toEqual(['proposal.read', 'proposal.create'])
  })

  it('should return null when session is not set on request', () => {
    const request = { nextUrl: new URL('http://localhost/api/test') } as unknown as NextRequest

    const result = getSessionFromRequest(request)
    expect(result).toBeNull()
  })

  it('should return null when session is explicitly undefined', () => {
    const request = { nextUrl: new URL('http://localhost/api/test') } as unknown as NextRequest
    ;(request as any).session = undefined

    const result = getSessionFromRequest(request)
    expect(result).toBeNull()
  })
})
