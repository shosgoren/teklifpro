import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { stockQuerySchema } from '@/shared/validations/stock';
import { Prisma, ProductType } from '@prisma/client';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('StockAPI');

const querySchema = stockQuerySchema;

const stockListSelect = {
  id: true, code: true, name: true, productType: true, unit: true,
  stockQuantity: true, minStockLevel: true, costPrice: true, listPrice: true,
} as const;

type StockListItem = Prisma.ProductGetPayload<{ select: typeof stockListSelect }>;

async function handleGet(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const searchParams = request.nextUrl.searchParams;
    const queryData = querySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      search: searchParams.get('search') || '',
      type: searchParams.get('type') || '',
      lowStock: searchParams.get('lowStock') || '',
    });

    const page = Math.max(1, parseInt(queryData.page));
    const limit = Math.min(100, Math.max(1, parseInt(queryData.limit)));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId: session.tenant.id,
      trackStock: true,
      deletedAt: null,
    };

    if (queryData.search) {
      where.OR = [
        { name: { contains: queryData.search, mode: 'insensitive' } },
        { code: { contains: queryData.search, mode: 'insensitive' } },
      ];
    }

    if (queryData.type) {
      where.productType = queryData.type as ProductType;
    }

    if (queryData.lowStock === 'true') {
      where.minStockLevel = { gt: 0 };
      where.stockQuantity = { lt: prisma.product.fields?.minStockLevel };
    }

    // For lowStock filter we need raw query approach since Prisma can't compare two columns directly
    let products: StockListItem[];
    let total: number;

    if (queryData.lowStock === 'true') {
      // Remove the invalid field comparison and use a different approach
      delete where.stockQuantity;
      delete where.minStockLevel;

      const allProducts = await prisma.product.findMany({
        where: {
          ...where,
          minStockLevel: { gt: 0 },
        },
        select: stockListSelect,
      });

      const filtered = allProducts.filter(
        (p) => Number(p.stockQuantity) < Number(p.minStockLevel)
      );

      total = filtered.length;
      products = filtered.slice(skip, skip + limit);
    } else {
      total = await prisma.product.count({ where });

      products = await prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: stockListSelect,
      });
    }

    const formattedProducts = products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      productType: p.productType,
      unit: p.unit,
      stockQuantity: Number(p.stockQuantity) || 0,
      minStockLevel: Number(p.minStockLevel) || 0,
      costPrice: Number(p.costPrice) || 0,
      listPrice: Number(p.listPrice) || 0,
      isLowStock:
        Number(p.minStockLevel) > 0 &&
        Number(p.stockQuantity) < Number(p.minStockLevel),
    }));

    return NextResponse.json({
      success: true,
      data: {
        products: formattedProducts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('GET /api/v1/stock error:', error);

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

export const GET = withAuth(handleGet, ['stock.read']);
