import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';

/**
 * GET /api/v1/products/meta
 * Returns distinct categories and units used by this tenant's products.
 */
async function handleGet(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const [categoryRows, unitRows] = await Promise.all([
      prisma.product.findMany({
        where: { tenantId: session.tenant.id, deletedAt: null, category: { not: null } },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      prisma.product.findMany({
        where: { tenantId: session.tenant.id, deletedAt: null },
        select: { unit: true },
        distinct: ['unit'],
        orderBy: { unit: 'asc' },
      }),
    ]);

    const categories = categoryRows
      .map((r) => r.category)
      .filter((c): c is string => !!c);

    const units = unitRows.map((r) => r.unit);

    return NextResponse.json({
      success: true,
      data: { categories, units },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['product.read']);
