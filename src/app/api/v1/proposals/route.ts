import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { ApiResponse } from '@/shared/types';
import { getAuth } from '@clerk/nextjs/server';
import { generateProposalNumber, generatePublicToken } from '@/shared/utils/generators';

// Validation schemas
const CreateProposalSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      tax: z.number().nonnegative().optional(),
    })
  ),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  expiresAt: z.date().optional(),
  notes: z.string().optional(),
});

type CreateProposalInput = z.infer<typeof CreateProposalSchema>;

const GetProposalsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
});

type GetProposalsQuery = z.infer<typeof GetProposalsSchema>;

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          data: null,
        },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = GetProposalsSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
    });

    const skip = (queryParams.page - 1) * queryParams.limit;

    // Build where clause
    const whereClause: any = {
      tenant: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    };

    if (queryParams.search) {
      whereClause.OR = [
        { title: { contains: queryParams.search, mode: 'insensitive' } },
        { client: { name: { contains: queryParams.search, mode: 'insensitive' } } },
        { proposalNumber: { contains: queryParams.search, mode: 'insensitive' } },
      ];
    }

    if (queryParams.status) {
      whereClause.status = queryParams.status;
    }

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where: whereClause,
        include: {
          client: true,
          items: true,
          activities: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        skip,
        take: queryParams.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.proposal.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / queryParams.limit);

    return NextResponse.json({
      success: true,
      data: {
        proposals,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/v1/proposals error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          data: null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          data: null,
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const payload = CreateProposalSchema.parse(body);

    // Get tenant from user membership
    const tenant = await prisma.tenant.findFirst({
      where: {
        members: {
          some: { userId },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          data: null,
        },
        { status: 404 }
      );
    }

    // Get or create client
    let client = await prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
        id: payload.clientId,
      },
    });

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client not found',
          data: null,
        },
        { status: 404 }
      );
    }

    // Calculate totals
    const itemsTotal = payload.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const tax = item.tax ?? 0;
      return sum + itemTotal + (itemTotal * tax) / 100;
    }, 0);

    const taxAmount = payload.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const tax = item.tax ?? 0;
      return sum + (itemTotal * tax) / 100;
    }, 0);

    const subtotal = itemsTotal - taxAmount;

    // Generate proposal number and token
    const proposalNumber = await generateProposalNumber(tenant.id);
    const publicToken = generatePublicToken();

    // Create proposal with items
    const proposal = await prisma.proposal.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        proposalNumber,
        publicToken,
        title: payload.title,
        description: payload.description,
        clientEmail: payload.clientEmail,
        clientPhone: payload.clientPhone,
        status: 'DRAFT',
        subtotal,
        taxAmount,
        total: itemsTotal,
        expiresAt: payload.expiresAt,
        notes: payload.notes,
        items: {
          create: payload.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            tax: item.tax ?? 0,
            total: item.quantity * item.unitPrice,
          })),
        },
        activities: {
          create: {
            type: 'CREATED',
            description: 'Teklif oluşturuldu',
          },
        },
      },
      include: {
        client: true,
        items: true,
        activities: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: proposal,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/v1/proposals error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          data: null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      },
      { status: 500 }
    );
  }
}
