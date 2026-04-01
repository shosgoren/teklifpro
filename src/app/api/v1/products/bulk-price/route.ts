import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/shared/lib/auth';

const bulkPriceSchema = z.object({
  percentage: z.number().min(-99).max(1000),
  field: z.enum(['listPrice', 'costPrice']).default('listPrice'),
  category: z.string().optional(),
  productType: z.enum(['COMMERCIAL', 'RAW_MATERIAL', 'SEMI_FINISHED', 'CONSUMABLE']).optional(),
  productIds: z.array(z.string().uuid()).optional(),
});

/**
 * PUT /api/v1/products/bulk-price
 * Toplu fiyat güncelleme (% artır/azalt)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = bulkPriceSchema.parse(body);
    const multiplier = 1 + data.percentage / 100;

    const where: any = {
      tenantId: session.user.tenantId,
      deletedAt: null,
      isActive: true,
    };

    if (data.category) {
      where.category = data.category;
    }
    if (data.productType) {
      where.productType = data.productType;
    }
    if (data.productIds && data.productIds.length > 0) {
      where.id = { in: data.productIds };
    }

    const products = await prisma.product.findMany({
      where,
      select: { id: true, listPrice: true, costPrice: true },
    });

    let updatedCount = 0;

    await prisma.$transaction(
      products.map((p) => {
        const currentPrice = data.field === 'listPrice'
          ? (p.listPrice?.toNumber?.() || 0)
          : (p.costPrice?.toNumber?.() || 0);
        const newPrice = Math.max(0, Math.round(currentPrice * multiplier * 100) / 100);

        updatedCount++;
        return prisma.product.update({
          where: { id: p.id },
          data: { [data.field]: newPrice },
        });
      })
    );

    return NextResponse.json({
      success: true,
      data: { updatedCount, percentage: data.percentage, field: data.field },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('PUT /api/v1/products/bulk-price error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
