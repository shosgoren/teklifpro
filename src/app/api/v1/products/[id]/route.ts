import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { createProductSchema } from '@/shared/validations/product';
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

    // Validate request body with Zod (partial for PUT)
    const updateSchema = createProductSchema.partial();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const validatedData = validation.data;

    const existing = await prisma.product.findFirst({
      where: { id: params.id, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Track price changes
    const priceFields = [
      { field: 'listPrice', bodyVal: validatedData.listPrice, existingVal: existing.listPrice },
      { field: 'costPrice', bodyVal: validatedData.costPrice, existingVal: existing.costPrice },
      { field: 'laborCost', bodyVal: validatedData.laborCost, existingVal: existing.laborCost },
    ];

    const priceChanges = priceFields
      .filter(({ bodyVal, existingVal }) => {
        if (bodyVal === undefined) return false;
        return Number(bodyVal) !== Number(existingVal);
      })
      .map(({ field, bodyVal, existingVal }) => ({
        tenantId: session.tenant.id,
        productId: params.id,
        field,
        oldValue: new Decimal(Number(existingVal)),
        newValue: new Decimal(Number(bodyVal)),
        changedBy: session.user.id,
      }));

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: validatedData.name ?? existing.name,
        code: validatedData.code ?? existing.code,
        description: validatedData.description ?? existing.description,
        category: validatedData.category ?? existing.category,
        productType: validatedData.productType ?? existing.productType,
        unit: validatedData.unit ?? existing.unit,
        listPrice: validatedData.listPrice !== undefined ? validatedData.listPrice : existing.listPrice,
        costPrice: validatedData.costPrice !== undefined ? validatedData.costPrice : existing.costPrice,
        laborCost: validatedData.laborCost !== undefined ? validatedData.laborCost : existing.laborCost,
        overheadRate: validatedData.overheadRate !== undefined ? validatedData.overheadRate : existing.overheadRate,
        minStockLevel: validatedData.minStockLevel !== undefined ? validatedData.minStockLevel : existing.minStockLevel,
        currency: existing.currency,
        vatRate: validatedData.vatRate !== undefined ? validatedData.vatRate : existing.vatRate,
        isActive: validatedData.isActive !== undefined ? validatedData.isActive : existing.isActive,
      },
    });

    // Log price changes (fire-and-forget)
    if (priceChanges.length > 0) {
      prisma.priceHistory.createMany({ data: priceChanges }).catch((err) => {
        logger.error('Failed to log price history:', err);
      });
    }

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
