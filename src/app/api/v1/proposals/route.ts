import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Validation schemas
const CreateProposalSchema = z.object({
  customerId: z.string(),
  contactId: z.string().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      unit: z.string().default('Adet'),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      discountRate: z.number().min(0).max(100).default(0),
      vatRate: z.number().min(0).max(100).default(18),
    })
  ),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  voiceNoteData: z.string().nullable().optional(),
  voiceNoteDuration: z.number().nullable().optional(),
});

const GetProposalsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'REVISED', 'EXPIRED', 'CANCELLED']).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = GetProposalsSchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });

    const skip = (queryParams.page - 1) * queryParams.limit;

    const whereClause: any = {
      tenantId: session.tenant.id,
      deletedAt: null,
    };

    if (queryParams.search) {
      whereClause.OR = [
        { title: { contains: queryParams.search, mode: 'insensitive' } },
        { customer: { name: { contains: queryParams.search, mode: 'insensitive' } } },
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
          customer: true,
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
        { success: false, error: 'Validation error' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const payload = CreateProposalSchema.parse(body);

    // Calculate totals
    let subtotal = 0;
    let vatTotal = 0;
    for (const item of payload.items) {
      const lineTotal = item.quantity * item.unitPrice * (1 - item.discountRate / 100);
      subtotal += lineTotal;
      vatTotal += lineTotal * (item.vatRate / 100);
    }

    const { nanoid } = await import('nanoid');
    const proposalNumber = `TKL-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
    const publicToken = nanoid(24);

    const proposal = await prisma.proposal.create({
      data: {
        tenantId: session.tenant.id,
        userId: session.user.id,
        customerId: payload.customerId,
        contactId: payload.contactId,
        proposalNumber,
        publicToken,
        title: payload.title,
        description: payload.description,
        status: 'DRAFT',
        subtotal,
        vatTotal,
        grandTotal: subtotal + vatTotal,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
        notes: payload.notes,
        paymentTerms: payload.paymentTerms,
        deliveryTerms: payload.deliveryTerms,
        voiceNoteData: payload.voiceNoteData || null,
        voiceNoteDuration: payload.voiceNoteDuration || null,
        items: {
          create: payload.items.map((item, index) => ({
            name: item.name,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountRate: item.discountRate,
            vatRate: item.vatRate,
            lineTotal: item.quantity * item.unitPrice * (1 - item.discountRate / 100),
            sortOrder: index,
          })),
        },
        activities: {
          create: {
            type: 'CREATED',
            description: 'Teklif olusturuldu',
          },
        },
      },
      include: {
        customer: true,
        items: true,
        activities: true,
      },
    });

    return NextResponse.json(
      { success: true, data: proposal },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/v1/proposals error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
