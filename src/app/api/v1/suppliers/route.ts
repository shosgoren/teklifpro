import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/shared/lib/auth';

// ==================== Schemas ====================

const createSupplierSchema = z.object({
  name: z.string().min(1, 'Tedarikci adi gerekli').max(255),
  contactName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Gecerli bir e-posta adresi girin').max(255).optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  taxNumber: z.string().max(50).optional(),
  taxOffice: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional().default(''),
});

// ==================== GET: List Suppliers ====================

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      search: searchParams.get('search') || '',
    });

    const page = Math.max(1, parseInt(query.page));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit)));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: session.user.tenantId,
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { contactName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          contactName: true,
          phone: true,
          email: true,
          address: true,
          taxNumber: true,
          taxOffice: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { products: true },
          },
        },
      }),
    ]);

    const formatted = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      address: s.address,
      taxNumber: s.taxNumber,
      taxOffice: s.taxOffice,
      notes: s.notes,
      isActive: s.isActive,
      productCount: s._count.products,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        suppliers: formatted,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/v1/suppliers error:', error);

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

// ==================== POST: Create Supplier ====================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = createSupplierSchema.parse(body);

    // Filter out empty email string
    const supplierData: any = {
      ...data,
      tenantId: session.user.tenantId,
    };
    if (supplierData.email === '') {
      delete supplierData.email;
    }

    const supplier = await prisma.supplier.create({
      data: supplierData,
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        taxNumber: true,
        taxOffice: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...supplier,
          createdAt: supplier.createdAt.toISOString(),
          updatedAt: supplier.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/v1/suppliers error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
