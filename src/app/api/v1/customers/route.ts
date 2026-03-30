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

const createCustomerSchema = z.object({
  companyName: z.string().min(1, 'Firma adı gerekli').max(255),
  contactName: z.string().min(1, 'İlgili kişi gerekli').max(255),
  phone: z.string().min(1, 'Telefon gerekli').max(20),
  email: z.string().email('Geçerli e-posta adresi girin'),
  city: z.string().min(1, 'Şehir gerekli').max(100),
  address: z.string().optional().default(''),
  taxNumber: z.string().optional().default(''),
  isActive: z.boolean().default(true),
});

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional().default(''),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
});

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
type QueryInput = z.infer<typeof querySchema>;

interface CustomerResponse {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  taxNumber: string;
  isActive: boolean;
  balance: number;
  lastSync: string | null;
  syncedFromParasut: boolean;
  createdAt: string;
}

interface ListResponse {
  customers: CustomerResponse[];
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
        { companyName: { contains: queryData.search, mode: 'insensitive' } },
        { contactName: { contains: queryData.search, mode: 'insensitive' } },
        { email: { contains: queryData.search, mode: 'insensitive' } },
        { phone: { contains: queryData.search, mode: 'insensitive' } },
      ];
    }

    if (queryData.status === 'active') {
      where.isActive = true;
    } else if (queryData.status === 'inactive') {
      where.isActive = false;
    }

    const total = await prisma.customer.count({ where });

    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        phone: true,
        email: true,
        city: true,
        address: true,
        taxNumber: true,
        isActive: true,
        balance: true,
        lastSync: true,
        syncedFromParasut: true,
        createdAt: true,
      },
    });

    const formattedCustomers: CustomerResponse[] = customers.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactName: c.contactName,
      phone: c.phone,
      email: c.email,
      city: c.city,
      address: c.address || '',
      taxNumber: c.taxNumber || '',
      isActive: c.isActive,
      balance: c.balance?.toNumber?.() || 0,
      lastSync: c.lastSync?.toISOString?.() || null,
      syncedFromParasut: c.syncedFromParasut || false,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        customers: formattedCustomers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/v1/customers error:', error);

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

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<CustomerResponse>>> {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        } as ApiResponse<CustomerResponse>,
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        ...data,
        tenantId: session.user.tenantId,
        balance: 0,
        syncedFromParasut: false,
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        phone: true,
        email: true,
        city: true,
        address: true,
        taxNumber: true,
        isActive: true,
        balance: true,
        lastSync: true,
        syncedFromParasut: true,
        createdAt: true,
      },
    });

    const formattedCustomer: CustomerResponse = {
      id: customer.id,
      companyName: customer.companyName,
      contactName: customer.contactName,
      phone: customer.phone,
      email: customer.email,
      city: customer.city,
      address: customer.address || '',
      taxNumber: customer.taxNumber || '',
      isActive: customer.isActive,
      balance: customer.balance?.toNumber?.() || 0,
      lastSync: customer.lastSync?.toISOString?.() || null,
      syncedFromParasut: customer.syncedFromParasut || false,
      createdAt: customer.createdAt.toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: formattedCustomer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/v1/customers error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
        } as ApiResponse<CustomerResponse>,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      } as ApiResponse<CustomerResponse>,
      { status: 500 }
    );
  }
}
