import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { createNoteSchema } from '@/shared/validations/customer';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('CustomerNotesAPI');

/**
 * GET /api/v1/customers/[id]/notes
 */
async function handleGet(
  req: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(req)!;
    const params = context!.params;

    const customerId = params.id;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Musteri bulunamadi' }, { status: 404 });
    }

    const [notes, total] = await Promise.all([
      prisma.customerNote.findMany({
        where: { customerId, deletedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customerNote.count({
        where: { customerId, deletedAt: null },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + limit < total,
      },
    });
  } catch (error) {
    logger.error('GET /api/v1/customers/[id]/notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/customers/[id]/notes
 */
async function handlePost(
  req: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(req)!;
    const params = context!.params;

    const customerId = params.id;
    const body = await req.json();
    const validatedData = createNoteSchema.parse(body);

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Musteri bulunamadi' }, { status: 404 });
    }

    const note = await prisma.customerNote.create({
      data: {
        customerId,
        userId: session.user.id,
        content: validatedData.content,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('POST /api/v1/customers/[id]/notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/customers/[id]/notes
 */
async function handleDelete(
  req: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(req)!;
    const params = context!.params;

    const customerId = params.id;
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json({ error: 'noteId query parametresi gereklidir' }, { status: 400 });
    }

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Musteri bulunamadi' }, { status: 404 });
    }

    // Soft delete
    await prisma.customerNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Not silindi' });
  } catch (error) {
    logger.error('DELETE /api/v1/customers/[id]/notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, ['customer.read']);
export const POST = withAuth(handlePost, ['customer.update']);
export const DELETE = withAuth(handleDelete, ['customer.update']);
