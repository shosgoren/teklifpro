import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/shared/lib/auth';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

const createProductSchema = z.object({
  code: z.string().min(1, 'Urun kodu gerekli').max(50),
  name: z.string().min(1, 'Urun adi gerekli').max(255),
  category: z.string().max(100).optional(),
  unit: z.string().min(1, 'Birim gerekli').max(50),
  listPrice: z.number().nonnegative('Liste fiyati negatif olamaz'),
  vatRate: z.number().min(0).max(100).default(18),
  isActive: z.boolean().default(true),
  description: z.string().optional().default(''),
});

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional().default(''),
  category: z.string().optional().default(''),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
});

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

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ListResponse>>> {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        } as ApiResponse<ListResponse>,
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const queryData = querySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      status: searchParams.get('status') || 'all',
    });

    const page = Math.max(1, parseInt(queryData.page));
    const limit = Math.min(100, Math.max(1, parseInt(queryData.limit)));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: session.user.tenantId,
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

    const total = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
        parasutId: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

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
      syncedFromParasut: !!p.parasutId,
      lastSyncAt: p.lastSyncAt?.toISOString?.() || null,
      createdAt: p.createdAt.toISOString(),
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
    console.error('GET /api/v1/products error:', error);

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

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ProductResponse>>> {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        } as ApiResponse<ProductResponse>,
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = createProductSchema.parse(body);

    const existingProduct = await prisma.product.findFirst({
      where: {
        tenantId: session.user.tenantId,
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
        tenantId: session.user.tenantId,
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
        parasutId: true,
        lastSyncAt: true,
        createdAt: true,
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
    console.error('POST /api/v1/products error:', error);

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
