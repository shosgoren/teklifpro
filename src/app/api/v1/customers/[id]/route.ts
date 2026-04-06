import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('CustomerDetailAPI');

/**
 * GET /api/v1/customers/[id]
 */
async function handleGet(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const params = context!.params;

    const customer = await prisma.customer.findFirst({
      where: { id: params.id, tenantId: session.tenant.id, deletedAt: null },
      include: {
        contacts: true,
        _count: { select: { proposals: true } },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    logger.error('GET /api/v1/customers/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/customers/[id]
 */
async function handlePut(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const params = context!.params;

    const body = await request.json();

    const existing = await prisma.customer.findFirst({
      where: { id: params.id, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: {
        name: body.name ?? existing.name,
        email: body.email ?? existing.email,
        phone: body.phone ?? existing.phone,
        address: body.address ?? existing.address,
        city: body.city ?? existing.city,
        taxNumber: body.taxNumber ?? existing.taxNumber,
        taxOffice: body.taxOffice ?? existing.taxOffice,
        notes: body.notes ?? existing.notes,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('PUT /api/v1/customers/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/customers/[id] (soft delete)
 */
async function handleDelete(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const params = context!.params;

    const existing = await prisma.customer.findFirst({
      where: { id: params.id, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await prisma.customer.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    logger.error('DELETE /api/v1/customers/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, ['customer.read']);
export const PUT = withAuth(handlePut, ['customer.update']);
export const DELETE = withAuth(handleDelete, ['customer.delete']);
