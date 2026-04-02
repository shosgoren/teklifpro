import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ProductDetailAPI');

/**
 * GET /api/v1/products/[id]
 */
async function handleGet(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const params = context!.params;

    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    logger.error('GET /api/v1/products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/products/[id]
 */
async function handlePut(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const params = context!.params;

    const body = await request.json();

    const existing = await prisma.product.findFirst({
      where: { id: params.id, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name ?? existing.name,
        code: body.code ?? existing.code,
        description: body.description ?? existing.description,
        category: body.category ?? existing.category,
        productType: body.productType ?? existing.productType,
        unit: body.unit ?? existing.unit,
        listPrice: body.listPrice !== undefined ? body.listPrice : existing.listPrice,
        costPrice: body.costPrice !== undefined ? body.costPrice : existing.costPrice,
        laborCost: body.laborCost !== undefined ? body.laborCost : existing.laborCost,
        overheadRate: body.overheadRate !== undefined ? body.overheadRate : existing.overheadRate,
        minStockLevel: body.minStockLevel !== undefined ? body.minStockLevel : existing.minStockLevel,
        currency: body.currency ?? existing.currency,
        vatRate: body.vatRate !== undefined ? body.vatRate : existing.vatRate,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('PUT /api/v1/products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/products/[id] (soft delete)
 */
async function handleDelete(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const params = context!.params;

    const existing = await prisma.product.findFirst({
      where: { id: params.id, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.product.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    logger.error('DELETE /api/v1/products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, ['product.read']);
export const PUT = withAuth(handlePut, ['product.update']);
export const DELETE = withAuth(handleDelete, ['product.delete']);
