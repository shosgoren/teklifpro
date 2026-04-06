import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { updateSupplierSchema } from '@/shared/validations/supplier';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('SupplierDetailAPI');

// ==================== GET: Get Supplier by ID ====================

async function handleGet(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;

    const id = context!.params.id;

    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        tenantId: session.tenant.id,
        deletedAt: null,
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const formatted = {
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      taxNumber: supplier.taxNumber,
      taxOffice: supplier.taxOffice,
      notes: supplier.notes,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
      products: supplier.products.map((ps) => ({
        id: ps.id,
        productId: ps.productId,
        productName: ps.product.name,
        productCode: ps.product.code,
        unit: ps.product.unit,
        unitPrice: Number(ps.unitPrice),
        currency: ps.currency,
        leadTimeDays: ps.leadTimeDays,
        minOrderQty: ps.minOrderQty ? Number(ps.minOrderQty) : null,
        isPreferred: ps.isPreferred,
        lastPurchaseAt: ps.lastPurchaseAt?.toISOString() || null,
        notes: ps.notes,
      })),
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    logger.error('GET /api/v1/suppliers/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ==================== PUT: Update Supplier ====================

async function handlePut(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;

    const id = context!.params.id;
    const body = await request.json();
    const data = updateSupplierSchema.parse(body);

    const existing = await prisma.supplier.findFirst({
      where: {
        id,
        tenantId: session.tenant.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        taxNumber: true,
        taxOffice: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('PUT /api/v1/suppliers/[id] error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ==================== DELETE: Soft Delete Supplier ====================

async function handleDelete(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;

    const id = context!.params.id;

    const existing = await prisma.supplier.findFirst({
      where: {
        id,
        tenantId: session.tenant.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Supplier deleted' },
    });
  } catch (error) {
    logger.error('DELETE /api/v1/suppliers/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['supplier.read']);
export const PUT = withAuth(handlePut, ['supplier.update']);
export const DELETE = withAuth(handleDelete, ['supplier.delete']);
