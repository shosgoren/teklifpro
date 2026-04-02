import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/shared/lib/auth';
import { linkSupplierSchema, unlinkSupplierSchema } from '@/shared/validations/product';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ProductSuppliersAPI');

// ==================== GET: List Suppliers for a Product ====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id: productId } = await params;

    // Verify product belongs to tenant
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: session.user.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const productSuppliers = await prisma.productSupplier.findMany({
      where: { productId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactName: true,
            phone: true,
            email: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { isPreferred: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const formatted = productSuppliers.map((ps) => ({
      id: ps.id,
      supplierId: ps.supplier.id,
      supplierName: ps.supplier.name,
      contactName: ps.supplier.contactName,
      phone: ps.supplier.phone,
      email: ps.supplier.email,
      supplierActive: ps.supplier.isActive,
      unitPrice: Number(ps.unitPrice),
      currency: ps.currency,
      leadTimeDays: ps.leadTimeDays,
      minOrderQty: ps.minOrderQty ? Number(ps.minOrderQty) : null,
      isPreferred: ps.isPreferred,
      lastPurchaseAt: ps.lastPurchaseAt?.toISOString() || null,
      notes: ps.notes,
      createdAt: ps.createdAt.toISOString(),
      updatedAt: ps.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: { suppliers: formatted },
    });
  } catch (error) {
    logger.error('GET /api/v1/products/[id]/suppliers error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ==================== POST: Link Supplier to Product ====================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id: productId } = await params;
    const body = await request.json();
    const data = linkSupplierSchema.parse(body);

    // Verify product belongs to tenant
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: session.user.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify supplier belongs to same tenant
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: data.supplierId,
        tenantId: session.user.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check for existing link
    const existing = await prisma.productSupplier.findUnique({
      where: {
        productId_supplierId: {
          productId,
          supplierId: data.supplierId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Bu tedarikci zaten bu urune bagli', code: 'DUPLICATE' },
        { status: 409 }
      );
    }

    const productSupplier = await prisma.productSupplier.create({
      data: {
        productId,
        supplierId: data.supplierId,
        unitPrice: data.unitPrice,
        currency: data.currency,
        leadTimeDays: data.leadTimeDays ?? null,
        minOrderQty: data.minOrderQty ?? null,
        isPreferred: data.isPreferred,
        notes: data.notes ?? null,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: productSupplier.id,
          productId: productSupplier.productId,
          supplierId: productSupplier.supplierId,
          supplierName: productSupplier.supplier.name,
          contactName: productSupplier.supplier.contactName,
          unitPrice: Number(productSupplier.unitPrice),
          currency: productSupplier.currency,
          leadTimeDays: productSupplier.leadTimeDays,
          minOrderQty: productSupplier.minOrderQty ? Number(productSupplier.minOrderQty) : null,
          isPreferred: productSupplier.isPreferred,
          notes: productSupplier.notes,
          createdAt: productSupplier.createdAt.toISOString(),
          updatedAt: productSupplier.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/v1/products/[id]/suppliers error:', error);

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

// ==================== DELETE: Remove Supplier Link from Product ====================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id: productId } = await params;
    const body = await request.json();
    const data = unlinkSupplierSchema.parse(body);

    // Verify product belongs to tenant
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: session.user.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Find and delete the link
    const existing = await prisma.productSupplier.findUnique({
      where: {
        productId_supplierId: {
          productId,
          supplierId: data.supplierId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Supplier link not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await prisma.productSupplier.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Supplier link removed' },
    });
  } catch (error) {
    logger.error('DELETE /api/v1/products/[id]/suppliers error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
