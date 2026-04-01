import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/shared/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Fetch all products with stock tracking enabled and minStockLevel > 0
    const products = await prisma.product.findMany({
      where: {
        tenantId: session.user.tenantId,
        trackStock: true,
        minStockLevel: { gt: 0 },
      },
      select: {
        id: true,
        code: true,
        name: true,
        productType: true,
        unit: true,
        stockQuantity: true,
        minStockLevel: true,
        costPrice: true,
        listPrice: true,
      },
    });

    // Filter in-memory since Prisma cannot compare two columns
    const lowStockProducts = products
      .filter((p) => Number(p.stockQuantity) < Number(p.minStockLevel))
      .map((p) => {
        const stockQuantity = Number(p.stockQuantity);
        const minStockLevel = Number(p.minStockLevel);
        const deficit = minStockLevel - stockQuantity;

        return {
          id: p.id,
          code: p.code,
          name: p.name,
          productType: p.productType,
          unit: p.unit,
          stockQuantity,
          minStockLevel,
          deficit,
          costPrice: Number(p.costPrice) || 0,
          listPrice: Number(p.listPrice) || 0,
        };
      })
      .sort((a, b) => b.deficit - a.deficit);

    return NextResponse.json({
      success: true,
      data: {
        alerts: lowStockProducts,
        totalAlerts: lowStockProducts.length,
      },
    });
  } catch (error) {
    console.error('GET /api/v1/stock/alerts error:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
