import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';

/**
 * GET /api/v1/customers/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('GET /api/v1/customers/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/customers/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('PUT /api/v1/customers/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/customers/[id] (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('DELETE /api/v1/customers/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
