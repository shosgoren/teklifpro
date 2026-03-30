import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { AuditLogger } from '@/lib/audit/auditLogger';

// Validasyon semalari
const createNoteSchema = z.object({
  content: z.string().min(1, 'Not icerigi bos olamaz').max(5000),
  type: z.enum(['note', 'call', 'meeting', 'email', 'task']),
  isPinned: z.boolean().optional().default(false),
});

const updateNoteSchema = z.object({
  noteId: z.string().min(1, 'Gecerli bir not ID\'si gereklidir'),
  content: z.string().min(1, 'Not icerigi bos olamaz').max(5000).optional(),
  isPinned: z.boolean().optional(),
});

const deleteNoteSchema = z.object({
  noteId: z.string().min(1, 'Gecerli bir not ID\'si gereklidir'),
});

const listNotesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['note', 'call', 'meeting', 'email', 'task']).optional(),
});

interface NoteResponse {
  id: string;
  content: string;
  type: 'note' | 'call' | 'meeting' | 'email' | 'task';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  attachmentsCount: number;
}

interface ListNotesResponse {
  data: NoteResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

/**
 * GET /api/v1/customers/[id]/notes
 * Note: Note model is not yet implemented in the database schema.
 * This endpoint returns an empty list until the Note model is added.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);

    const queryParams = listNotesSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
    });

    const customerId = params.id;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Musteri bulunamadi' },
        { status: 404 }
      );
    }

    // Note model is not yet in the schema - return empty for now
    const response: ListNotesResponse = {
      data: [],
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/v1/customers/[id]/notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/customers/[id]/notes
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const body = await req.json();
    const validatedData = createNoteSchema.parse(body);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Musteri bulunamadi' },
        { status: 404 }
      );
    }

    // Note model is not yet in the schema
    return NextResponse.json(
      { error: 'Note model is not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('POST /api/v1/customers/[id]/notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/customers/[id]/notes
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const body = await req.json();
    const validatedData = updateNoteSchema.parse(body);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Musteri bulunamadi' },
        { status: 404 }
      );
    }

    // Note model is not yet in the schema
    return NextResponse.json(
      { error: 'Note model is not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('PUT /api/v1/customers/[id]/notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/customers/[id]/notes
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { error: 'noteId query parametresi gereklidir' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Musteri bulunamadi' },
        { status: 404 }
      );
    }

    // Note model is not yet in the schema
    return NextResponse.json(
      { error: 'Note model is not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('DELETE /api/v1/customers/[id]/notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
