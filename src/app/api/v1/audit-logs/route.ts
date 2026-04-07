import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import {
  successResponse,
  withErrorHandling,
  assertAuthenticated,
  assertAuthorized,
  badRequest,
  notFound,
  ApiResponse,
} from '@/shared/utils/errorHandler';
import { sanitizeInput } from '@/shared/utils/sanitize';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';

/**
 * Audit log entry response type
 */
interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  metadata: unknown;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}

/**
 * Paginated response type
 */
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Audit logs list request query params
 */
interface AuditLogsQuery {
  page?: string;
  pageSize?: string;
  userId?: string;
  actionType?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

/**
 * GET /api/v1/audit-logs
 * List audit logs for the current tenant
 * Requires OWNER or ADMIN role
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 25, max: 100)
 * - userId: Filter by user ID
 * - actionType: Filter by action type (CREATE, UPDATE, DELETE, SEND, LOGIN)
 * - entityType: Filter by entity type (PROPOSAL, CUSTOMER, PRODUCT, USER, SETTING)
 * - dateFrom: Filter from date (ISO 8601)
 * - dateTo: Filter to date (ISO 8601)
 * - search: Search in details field
 */
async function handleGet(
  req: NextRequest
): Promise<Response> {
  const session = getSessionFromRequest(req)!;

  const userId = session.user.id;
  const userRole = session.user.role || 'OWNER';
  const tenantId = session.tenant.id;

  // Validate authorization
  assertAuthenticated(userId);
  assertAuthorized(userRole, ['OWNER', 'ADMIN']);

  // Parse and validate query parameters
  const { searchParams } = new URL(req.url);
  const query = {
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '25',
    userId: searchParams.get('userId'),
    actionType: searchParams.get('actionType'),
    entityType: searchParams.get('entityType'),
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
    search: searchParams.get('search'),
  } as AuditLogsQuery;

  // Validate page and pageSize
  let page = parseInt(query.page || '1', 10);
  let pageSize = parseInt(query.pageSize || '25', 10);

  if (isNaN(page) || page < 1) {
    page = 1;
  }
  if (isNaN(pageSize) || pageSize < 1) {
    pageSize = 25;
  }
  if (pageSize > 100) {
    pageSize = 100;
  }

  const skip = (page - 1) * pageSize;

  // Build filter conditions
  const where: Record<string, unknown> = {
    tenantId,
  };

  // Filter by user
  if (query.userId) {
    const sanitizedUserId = sanitizeInput(query.userId);
    where.userId = sanitizedUserId;
  }

  // Filter by action type
  if (query.actionType) {
    const actionType = sanitizeInput(query.actionType).toUpperCase();
    const validActions = ['CREATE', 'UPDATE', 'DELETE', 'SEND', 'LOGIN'];
    if (validActions.includes(actionType)) {
      where.action = actionType;
    }
  }

  // Filter by entity type
  if (query.entityType) {
    const entityType = sanitizeInput(query.entityType).toUpperCase();
    const validEntities = ['PROPOSAL', 'CUSTOMER', 'PRODUCT', 'USER', 'SETTING'];
    if (validEntities.includes(entityType)) {
      where.entity = entityType;
    }
  }

  // Filter by date range
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};

    if (query.dateFrom) {
      const dateFrom = new Date(query.dateFrom);
      if (!isNaN(dateFrom.getTime())) {
        (where.createdAt as Record<string, unknown>).gte = dateFrom;
      }
    }

    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      // Set to end of day
      dateTo.setHours(23, 59, 59, 999);
      if (!isNaN(dateTo.getTime())) {
        (where.createdAt as Record<string, unknown>).lte = dateTo;
      }
    }
  }

  // Search in action field
  if (query.search) {
    const searchTerm = sanitizeInput(query.search);
    if (searchTerm.length > 0) {
      where.action = {
        contains: searchTerm,
        mode: 'insensitive' as const,
      };
    }
  }

  // Fetch total count for pagination
  const total = await prisma.auditLog.count({ where });

  // Fetch audit logs with user details
  const auditLogs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: pageSize,
    skip,
  });

  // Transform and format response
  const formattedLogs: AuditLogEntry[] = auditLogs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    userId: log.userId,
    user: log.user,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    oldData: log.oldData as Record<string, unknown> | null,
    newData: log.newData as Record<string, unknown> | null,
  }));

  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const paginatedResponse: ApiResponse<PaginatedResponse<AuditLogEntry>> = {
    success: true,
    data: {
      data: formattedLogs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    },
    timestamp: new Date().toISOString(),
  };

  return successResponse(paginatedResponse.data, 200);
}

/**
 * POST /api/v1/audit-logs
 * Create a new audit log entry
 * Internal use only - should be called by other services when logging actions
 * Requires authentication
 */
async function handlePost(
  req: NextRequest
): Promise<Response> {
  // Extract user info from authenticated session
  const session = getSessionFromRequest(req)!;
  const userId = session.user.id;
  const tenantId = session.tenant.id;
  const ipAddress = req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') || 'unknown';

  assertAuthenticated(userId);

  // Parse request body
  const body = await req.json();

  // Validate required fields
  if (
    !body.action ||
    !body.entity ||
    !body.entityId
  ) {
    throw badRequest('Missing required fields: action, entity, entityId');
  }

  // Validate action type
  const validActions = ['CREATE', 'UPDATE', 'DELETE', 'SEND', 'LOGIN'];
  const actionType = body.action.toUpperCase();
  if (!validActions.includes(actionType)) {
    throw badRequest(`Invalid actionType. Must be one of: ${validActions.join(', ')}`);
  }

  // Validate entity type
  const validEntities = ['PROPOSAL', 'CUSTOMER', 'PRODUCT', 'USER', 'SETTING'];
  const entityType = body.entity.toUpperCase();
  if (!validEntities.includes(entityType)) {
    throw badRequest(`Invalid entityType. Must be one of: ${validEntities.join(', ')}`);
  }

  // Sanitize inputs
  const sanitizedEntityId = sanitizeInput(body.entityId);

  // Create audit log
  const auditLog = await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: actionType,
      entity: entityType,
      entityId: sanitizedEntityId,
      ipAddress: ipAddress.split(',')[0].trim(),
      metadata: body.metadata || null,
      oldData: body.oldData || null,
      newData: body.newData || null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const formattedLog: AuditLogEntry = {
    id: auditLog.id,
    createdAt: auditLog.createdAt.toISOString(),
    userId: auditLog.userId,
    user: auditLog.user,
    action: auditLog.action,
    entity: auditLog.entity,
    entityId: auditLog.entityId,
    metadata: auditLog.metadata,
    ipAddress: auditLog.ipAddress,
    oldData: auditLog.oldData as Record<string, unknown> | null,
    newData: auditLog.newData as Record<string, unknown> | null,
  };

  return successResponse<AuditLogEntry>(formattedLog, 201);
}

/**
 * DELETE /api/v1/audit-logs/:id
 * Delete an audit log entry
 * Requires OWNER role
 * Note: In production, consider archiving instead of deleting for compliance
 */
async function handleDelete(
  req: NextRequest
): Promise<Response> {
  const session = getSessionFromRequest(req)!;
  const userId = session.user.id;
  const userRole = session.user.role || 'OWNER';
  const tenantId = session.tenant.id;

  assertAuthenticated(userId);
  assertAuthorized(userRole, ['OWNER']);

  // Extract ID from URL path
  const pathname = new URL(req.url).pathname;
  const id = pathname.split('/').pop();

  if (!id) {
    throw badRequest('Audit log ID is required');
  }

  const sanitizedId = sanitizeInput(id);

  // Verify audit log exists and belongs to tenant
  const auditLog = await prisma.auditLog.findUnique({
    where: { id: sanitizedId },
  });

  if (!auditLog) {
    throw notFound('Audit log');
  }

  if (auditLog.tenantId !== tenantId) {
    throw badRequest('Audit log does not belong to this tenant');
  }

  // Delete audit log
  await prisma.auditLog.delete({
    where: { id: sanitizedId },
  });

  return successResponse<{ id: string }>({ id: sanitizedId }, 200);
}

// Export wrapped handlers with auth and error handling
// GET uses withAuth for permission check, then withErrorHandling for error boundaries
const wrappedHandleGet = withErrorHandling(handleGet);
export const GET = withAuth(
  async (req: NextRequest) => (await wrappedHandleGet(req)) as NextResponse,
  ['audit.read']
);
const wrappedHandlePost = withErrorHandling(handlePost);
export const POST = withAuth(
  async (req: NextRequest) => (await wrappedHandlePost(req)) as NextResponse,
  ['audit.write']
);
const wrappedHandleDelete = withErrorHandling(handleDelete);
export const DELETE = withAuth(
  async (req: NextRequest) => (await wrappedHandleDelete(req)) as NextResponse,
  ['audit.write']
);
