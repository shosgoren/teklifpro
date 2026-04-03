import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('PriceHistoryAPI');

/**
 * GET /api/v1/products/[id]/price-history
 * Returns price change history for a product
 */
async function handleGet(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const productId = context!.params.id;

    // Verify product belongs to tenant
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId: session.tenant.id, deletedAt: null },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const history = await prisma.priceHistory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = history.map((h) => ({
      id: h.id,
      field: h.field,
      oldValue: Number(h.oldValue),
      newValue: Number(h.newValue),
      changedBy: h.changedBy,
      notes: h.notes,
      createdAt: h.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: { history: formatted },
    });
  } catch (error) {
    logger.error('GET /api/v1/products/[id]/price-history error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['product.read']);
