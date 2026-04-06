import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { createProductSchema, productQuerySchema } from '@/shared/validations/product';
import { Prisma } from '@prisma/client';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ProductAPI');

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

const querySchema = productQuerySchema;

type CreateProductInput = z.infer<typeof createProductSchema>;
type QueryInput = z.infer<typeof querySchema>;

interface ProductResponse {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  unit: string;
  listPrice: number;
  vatRate: number;
  isActive: boolean;
  description: string | null;
  productType: string;
  costPrice: number | null;
  laborCost: number | null;
  overheadRate: number | null;
  minStockLevel: number | null;
  syncedFromParasut: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

interface ListResponse {
  products: ProductResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

async function handleGet(request: NextRequest): Promise<NextResponse<ApiResponse<ListResponse>>> {
  try {
    const session = getSessionFromRequest(request)!;

    const searchParams = request.nextUrl.searchParams;
    const queryData = querySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      status: searchParams.get('status') || 'all',
      productType: searchParams.get('productType') || '',
      stockStatus: searchParams.get('stockStatus') || 'all',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    const page = Math.max(1, parseInt(queryData.page));
    const limit = Math.min(100, Math.max(1, parseInt(queryData.limit)));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId: session.tenant.id,
    };

    if (queryData.search) {
      where.OR = [
        { name: { contains: queryData.search, mode: 'insensitive' } },
        { code: { contains: queryData.search, mode: 'insensitive' } },
      ];
    }

    if (queryData.category) {
      where.category = queryData.category;
    }

    if (queryData.status === 'active') {
      where.isActive = true;
    } else if (queryData.status === 'inactive') {
      where.isActive = false;
    }

    if (queryData.productType) {
      where.productType = queryData.productType;
    }

    if (queryData.stockStatus === 'low') {
      where.trackStock = true;
      where.minStockLevel = { gt: 0 };
      where.stockQuantity = { lt: prisma.product.fields?.minStockLevel ?? undefined };
      // Use raw comparison: stockQuantity < minStockLevel
      const existingAnd = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
      where.AND = [
        ...existingAnd,
        { stockQuantity: { gt: 0 } },
      ];
      // For Prisma, we use a rawFilter approach below
    } else if (queryData.stockStatus === 'inStock') {
      where.trackStock = true;
      where.stockQuantity = { gt: 0 };
    } else if (queryData.stockStatus === 'outOfStock') {
      where.trackStock = true;
      where.stockQuantity = { lte: 0 };
    }

    // For low stock, we need post-filter since Prisma can't compare two columns directly
    // So we handle it differently: fetch all tracked products and filter
    let total: number;
    let products: any[];

    const orderBy = { [queryData.sortBy]: queryData.sortOrder };

    if (queryData.stockStatus === 'low') {
      // Remove the invalid stockQuantity filter for low stock
      delete where.stockQuantity;
      delete where.minStockLevel;
      delete where.AND;
      where.trackStock = true;

      const allTracked = await prisma.product.findMany({
        where,
        select: {
          id: true, code: true, name: true, category: true, unit: true,
          listPrice: true, vatRate: true, isActive: true, description: true,
          productType: true, costPrice: true, laborCost: true, overheadRate: true,
          minStockLevel: true, parasutId: true, lastSyncAt: true, createdAt: true,
          imageUrl: true, trackStock: true, stockQuantity: true,
        },
        orderBy,
      });

      const lowStockProducts = allTracked.filter((p) => {
        const stock = Number(p.stockQuantity);
        const minLevel = Number(p.minStockLevel);
        return minLevel > 0 && stock < minLevel;
      });

      total = lowStockProducts.length;
      products = lowStockProducts.slice(skip, skip + limit);
    } else {
      total = await prisma.product.count({ where });

      products = await prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          unit: true,
          listPrice: true,
          vatRate: true,
          isActive: true,
          description: true,
          productType: true,
          costPrice: true,
          laborCost: true,
          overheadRate: true,
          minStockLevel: true,
          parasutId: true,
          lastSyncAt: true,
          createdAt: true,
          imageUrl: true,
          trackStock: true,
          stockQuantity: true,
        },
      });
    }

    const formattedProducts: ProductResponse[] = products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      unit: p.unit,
      listPrice: p.listPrice?.toNumber?.() || 0,
      vatRate: Number(p.vatRate) || 18,
      isActive: p.isActive,
      description: p.description,
      productType: p.productType || 'COMMERCIAL',
      costPrice: p.costPrice?.toNumber?.() ?? null,
      laborCost: p.laborCost?.toNumber?.() ?? null,
      overheadRate: p.overheadRate?.toNumber?.() ?? null,
      minStockLevel: p.minStockLevel?.toNumber?.() ?? null,
      syncedFromParasut: !!p.parasutId,
      lastSyncAt: p.lastSyncAt?.toISOString?.() || null,
      createdAt: p.createdAt.toISOString(),
      imageUrl: p.imageUrl || null,
      trackStock: p.trackStock ?? false,
      stockQuantity: p.stockQuantity?.toNumber?.() ?? 0,
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
    logger.error('GET /api/v1/products error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
        } as ApiResponse<ListResponse>,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      } as ApiResponse<ListResponse>,
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest): Promise<NextResponse<ApiResponse<ProductResponse>>> {
  try {
    const session = getSessionFromRequest(request)!;

    const body = await request.json();
    const data = createProductSchema.parse(body);

    const existingProduct = await prisma.product.findFirst({
      where: {
        tenantId: session.tenant.id,
        code: data.code,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bu urun kodu zaten kullaniliyor',
          code: 'DUPLICATE_CODE',
        } as ApiResponse<ProductResponse>,
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        tenantId: session.tenant.id,
      },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        unit: true,
        listPrice: true,
        vatRate: true,
        isActive: true,
        description: true,
        productType: true,
        costPrice: true,
        laborCost: true,
        overheadRate: true,
        minStockLevel: true,
        parasutId: true,
        lastSyncAt: true,
        createdAt: true,
        imageUrl: true,
        trackStock: true,
        stockQuantity: true,
      },
    });

    const formattedProduct: ProductResponse = {
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      unit: product.unit,
      listPrice: product.listPrice?.toNumber?.() || 0,
      vatRate: Number(product.vatRate) || 18,
      isActive: product.isActive,
      description: product.description,
      productType: product.productType || 'COMMERCIAL',
      costPrice: product.costPrice?.toNumber?.() ?? null,
      laborCost: product.laborCost?.toNumber?.() ?? null,
      overheadRate: product.overheadRate?.toNumber?.() ?? null,
      minStockLevel: product.minStockLevel?.toNumber?.() ?? null,
      syncedFromParasut: !!product.parasutId,
      lastSyncAt: product.lastSyncAt?.toISOString?.() || null,
      createdAt: product.createdAt.toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: formattedProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/v1/products error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
        } as ApiResponse<ProductResponse>,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      } as ApiResponse<ProductResponse>,
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['product.read']);
export const POST = withAuth(handlePost, ['product.create']);
