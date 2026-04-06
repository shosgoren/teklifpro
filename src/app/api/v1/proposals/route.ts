import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { CreateProposalSchema, GetProposalsSchema } from '@/shared/validations/proposal';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ProposalAPI');

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Voice note security constants
const VOICE_NOTE_MAX_SIZE_BYTES = 512_000; // 500KB max (~5 min of WebM/opus)
const VOICE_NOTE_MAX_DURATION = 60; // 60 seconds max
const VOICE_NOTE_ALLOWED_MIMES = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'];

/**
 * Validate and sanitize base64 audio data.
 * Returns sanitized data URL or null if invalid.
 */
function validateVoiceNote(dataUrl: string): { valid: boolean; error?: string } {
  // Must be a data URL
  if (!dataUrl.startsWith('data:')) {
    return { valid: false, error: 'Invalid data URL format' };
  }

  // Extract MIME type
  const mimeMatch = dataUrl.match(/^data:(audio\/[a-z0-9;=\-+.]+);base64,/i);
  if (!mimeMatch) {
    return { valid: false, error: 'Invalid or non-audio MIME type' };
  }

  const mimeType = mimeMatch[1].split(';')[0].toLowerCase();
  if (!VOICE_NOTE_ALLOWED_MIMES.some(m => mimeType.startsWith(m.replace('audio/', 'audio/')))) {
    // More permissive: allow any audio/* type
    if (!mimeType.startsWith('audio/')) {
      return { valid: false, error: `Disallowed MIME type: ${mimeType}` };
    }
  }

  // Extract base64 payload
  const base64Part = dataUrl.split(',')[1];
  if (!base64Part) {
    return { valid: false, error: 'Missing base64 data' };
  }

  // Validate base64 format (only valid base64 characters)
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Part)) {
    return { valid: false, error: 'Invalid base64 characters detected' };
  }

  // Check decoded size
  const sizeInBytes = Math.ceil((base64Part.length * 3) / 4);
  if (sizeInBytes > VOICE_NOTE_MAX_SIZE_BYTES) {
    return { valid: false, error: `Voice note too large: ${Math.round(sizeInBytes / 1024)}KB (max ${VOICE_NOTE_MAX_SIZE_BYTES / 1024}KB)` };
  }

  return { valid: true };
}

async function handleGet(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = getSessionFromRequest(request)!;

    const searchParams = request.nextUrl.searchParams;
    const queryParams = GetProposalsSchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });

    const skip = (queryParams.page - 1) * queryParams.limit;

    const whereClause: Prisma.ProposalWhereInput = {
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
    logger.error('GET /api/v1/proposals error:', error);

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

async function handlePost(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = getSessionFromRequest(request)!;

    const body = await request.json();
    const payload = CreateProposalSchema.parse(body);

    // Validate voice note security
    if (payload.voiceNoteData) {
      const voiceValidation = validateVoiceNote(payload.voiceNoteData);
      if (!voiceValidation.valid) {
        return NextResponse.json(
          { success: false, error: `Voice note rejected: ${voiceValidation.error}` },
          { status: 400 }
        );
      }
    }

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
    logger.error('POST /api/v1/proposals error:', error);

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

export const GET = withAuth(handleGet, ['proposal.read']);
export const POST = withAuth(handlePost, ['proposal.create']);
