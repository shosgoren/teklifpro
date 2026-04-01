import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';

/**
 * GET /api/v1/products/[id]
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

    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('GET /api/v1/products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/products/[id]
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
    console.error('PUT /api/v1/products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/products/[id] (soft delete)
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
    console.error('DELETE /api/v1/products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
