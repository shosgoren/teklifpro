import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { createCustomerSchema, customerQuerySchema } from '@/shared/validations/customer';
import { Prisma } from '@prisma/client';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('CustomerAPI');

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

const querySchema = customerQuerySchema;

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
type QueryInput = z.infer<typeof querySchema>;

interface CustomerResponse {
  id: string;
  name: string;
  shortName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  taxNumber: string | null;
  isActive: boolean;
  balance: number;
  lastSyncAt: string | null;
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

async function handleGet(request: NextRequest): Promise<NextResponse<ApiResponse<ListResponse>>> {
  try {
    const session = getSessionFromRequest(request)!;

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

    const where: Prisma.CustomerWhereInput = {
      tenantId: session.tenant.id,
      deletedAt: null,
    };

    if (queryData.search) {
      where.OR = [
        { name: { contains: queryData.search, mode: 'insensitive' } },
        { shortName: { contains: queryData.search, mode: 'insensitive' } },
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
        name: true,
        shortName: true,
        phone: true,
        email: true,
        city: true,
        address: true,
        taxNumber: true,
        isActive: true,
        balance: true,
        lastSyncAt: true,
        parasutId: true,
        createdAt: true,
      },
    });

    const formattedCustomers: CustomerResponse[] = customers.map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      phone: c.phone,
      email: c.email,
      city: c.city,
      address: c.address || '',
      taxNumber: c.taxNumber || '',
      isActive: c.isActive,
      balance: c.balance?.toNumber?.() || 0,
      lastSyncAt: c.lastSyncAt?.toISOString?.() || null,
      syncedFromParasut: !!c.parasutId,
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
    logger.error('GET /api/v1/customers error:', error);

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

async function handlePost(request: NextRequest): Promise<NextResponse<ApiResponse<CustomerResponse>>> {
  try {
    const session = getSessionFromRequest(request)!;

    const body = await request.json();
    const data = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        ...data,
        tenantId: session.tenant.id,
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        phone: true,
        email: true,
        city: true,
        address: true,
        taxNumber: true,
        isActive: true,
        balance: true,
        lastSyncAt: true,
        parasutId: true,
        createdAt: true,
      },
    });

    const formattedCustomer: CustomerResponse = {
      id: customer.id,
      name: customer.name,
      shortName: customer.shortName,
      phone: customer.phone,
      email: customer.email,
      city: customer.city,
      address: customer.address || '',
      taxNumber: customer.taxNumber || '',
      isActive: customer.isActive,
      balance: customer.balance?.toNumber?.() || 0,
      lastSyncAt: customer.lastSyncAt?.toISOString?.() || null,
      syncedFromParasut: !!customer.parasutId,
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
    logger.error('POST /api/v1/customers error:', error);

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

export const GET = withAuth(handleGet, ['customer.read']);
export const POST = withAuth(handlePost, ['customer.create']);
