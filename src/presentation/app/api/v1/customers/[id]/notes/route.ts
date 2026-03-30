import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/createApiHandler';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { AuditLogger } from '@/lib/audit/auditLogger';

// Validasyon şemaları
const createNoteSchema = z.object({
  content: z.string().min(1, 'Not içeriği boş olamaz').max(5000),
  type: z.enum(['note', 'call', 'meeting', 'email', 'task']),
  isPinned: z.boolean().optional().default(false),
});

const updateNoteSchema = z.object({
  noteId: z.string().uuid('Geçerli bir not ID\'si gereklidir'),
  content: z.string().min(1, 'Not içeriği boş olamaz').max(5000).optional(),
  isPinned: z.boolean().optional(),
});

const deleteNoteSchema = z.object({
  noteId: z.string().uuid('Geçerli bir not ID\'si gereklidir'),
});

const listNotesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['note', 'call', 'meeting', 'email', 'task']).optional(),
});

type CreateNoteRequest = z.infer<typeof createNoteSchema>;
type UpdateNoteRequest = z.infer<typeof updateNoteSchema>;

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
 * Müşterinin notlarını listeler (sayfalanmış, tarih azalan sırada)
 */
async function handleGet(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);

  // Query parametrelerini valide et
  const queryParams = listNotesSchema.parse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    type: searchParams.get('type'),
  });

  const customerId = params.id;

  // Müşterinin varlığını kontrol et
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return NextResponse.json(
      { error: 'Müşteri bulunamadı' },
      { status: 404 }
    );
  }

  // Notları sorgula
  const where = {
    customerId,
    ...(queryParams.type && { type: queryParams.type }),
  };

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: {
        createdByUser: {
          select: { name: true },
        },
        attachments: {
          select: { id: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (queryParams.page - 1) * queryParams.limit,
      take: queryParams.limit,
    }),
    prisma.note.count({ where }),
  ]);

  const totalPages = Math.ceil(total / queryParams.limit);

  const response: ListNotesResponse = {
    data: notes.map((note) => ({
      id: note.id,
      content: note.content,
      type: note.type as 'note' | 'call' | 'meeting' | 'email' | 'task',
      createdBy: note.createdByUser?.name || 'Sistem',
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      isPinned: note.isPinned,
      attachmentsCount: note.attachments.length,
    })),
    pagination: {
      page: queryParams.page,
      limit: queryParams.limit,
      total,
      totalPages,
      hasNextPage: queryParams.page < totalPages,
    },
  };

  return NextResponse.json(response);
}

/**
 * POST /api/v1/customers/[id]/notes
 * Yeni bir not oluşturur
 */
async function handlePost(
  req: NextRequest,
  { params }: { params: { id: string } },
  context: { userId: string; userName: string }
) {
  const customerId = params.id;
  const body = await req.json();

  // Request body'yi valide et
  const validatedData = createNoteSchema.parse(body);

  // Müşterinin varlığını kontrol et
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return NextResponse.json(
      { error: 'Müşteri bulunamadı' },
      { status: 404 }
    );
  }

  // Not oluştur
  const note = await prisma.note.create({
    data: {
      customerId,
      content: validatedData.content,
      type: validatedData.type,
      isPinned: validatedData.isPinned,
      createdById: context.userId,
    },
    include: {
      createdByUser: {
        select: { name: true },
      },
      attachments: {
        select: { id: true },
      },
    },
  });

  // Audit log
  await AuditLogger.log({
    userId: context.userId,
    action: 'NOTE_CREATED',
    resourceType: 'Note',
    resourceId: note.id,
    metadata: {
      customerId,
      noteType: validatedData.type,
    },
  });

  const response: NoteResponse = {
    id: note.id,
    content: note.content,
    type: note.type as 'note' | 'call' | 'meeting' | 'email' | 'task',
    createdBy: note.createdByUser?.name || 'Sistem',
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    isPinned: note.isPinned,
    attachmentsCount: note.attachments.length,
  };

  return NextResponse.json(response, { status: 201 });
}

/**
 * PUT /api/v1/customers/[id]/notes
 * Mevcut bir notu günceller
 */
async function handlePut(
  req: NextRequest,
  { params }: { params: { id: string } },
  context: { userId: string; userName: string }
) {
  const customerId = params.id;
  const body = await req.json();

  // Request body'yi valide et
  const validatedData = updateNoteSchema.parse(body);

  // Müşterinin varlığını kontrol et
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return NextResponse.json(
      { error: 'Müşteri bulunamadı' },
      { status: 404 }
    );
  }

  // Notun varlığını ve müşteriye ait olduğunu kontrol et
  const existingNote = await prisma.note.findUnique({
    where: { id: validatedData.noteId },
  });

  if (!existingNote || existingNote.customerId !== customerId) {
    return NextResponse.json(
      { error: 'Not bulunamadı' },
      { status: 404 }
    );
  }

  // Notu güncelle
  const updateData: any = {};
  if (validatedData.content !== undefined) {
    updateData.content = validatedData.content;
  }
  if (validatedData.isPinned !== undefined) {
    updateData.isPinned = validatedData.isPinned;
  }

  const updatedNote = await prisma.note.update({
    where: { id: validatedData.noteId },
    data: updateData,
    include: {
      createdByUser: {
        select: { name: true },
      },
      attachments: {
        select: { id: true },
      },
    },
  });

  // Audit log
  await AuditLogger.log({
    userId: context.userId,
    action: 'NOTE_UPDATED',
    resourceType: 'Note',
    resourceId: updatedNote.id,
    metadata: {
      customerId,
      updatedFields: Object.keys(updateData),
    },
  });

  const response: NoteResponse = {
    id: updatedNote.id,
    content: updatedNote.content,
    type: updatedNote.type as 'note' | 'call' | 'meeting' | 'email' | 'task',
    createdBy: updatedNote.createdByUser?.name || 'Sistem',
    createdAt: updatedNote.createdAt.toISOString(),
    updatedAt: updatedNote.updatedAt.toISOString(),
    isPinned: updatedNote.isPinned,
    attachmentsCount: updatedNote.attachments.length,
  };

  return NextResponse.json(response);
}

/**
 * DELETE /api/v1/customers/[id]/notes
 * Bir notu siler (noteId query parametresi ile)
 */
async function handleDelete(
  req: NextRequest,
  { params }: { params: { id: string } },
  context: { userId: string; userName: string }
) {
  const customerId = params.id;
  const { searchParams } = new URL(req.url);

  // Query parametrelerini valide et
  const noteId = searchParams.get('noteId');

  if (!noteId) {
    return NextResponse.json(
      { error: 'noteId query parametresi gereklidir' },
      { status: 400 }
    );
  }

  const validatedData = deleteNoteSchema.parse({ noteId });

  // Müşterinin varlığını kontrol et
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return NextResponse.json(
      { error: 'Müşteri bulunamadı' },
      { status: 404 }
    );
  }

  // Notun varlığını ve müşteriye ait olduğunu kontrol et
  const note = await prisma.note.findUnique({
    where: { id: validatedData.noteId },
  });

  if (!note || note.customerId !== customerId) {
    return NextResponse.json(
      { error: 'Not bulunamadı' },
      { status: 404 }
    );
  }

  // Ektekleri sil
  await prisma.attachment.deleteMany({
    where: { noteId: validatedData.noteId },
  });

  // Notu sil
  await prisma.note.delete({
    where: { id: validatedData.noteId },
  });

  // Audit log
  await AuditLogger.log({
    userId: context.userId,
    action: 'NOTE_DELETED',
    resourceType: 'Note',
    resourceId: validatedData.noteId,
    metadata: {
      customerId,
    },
  });

  return NextResponse.json(
    { message: 'Not başarıyla silindi' },
    { status: 200 }
  );
}

/**
 * Ana API handler - auth ve permission kontrolleri ile
 */
export const GET = createApiHandler({
  permissions: ['customer.read'],
  handler: handleGet,
});

export const POST = createApiHandler({
  permissions: ['customer.update'],
  handler: handlePost,
});

export const PUT = createApiHandler({
  permissions: ['customer.update'],
  handler: handlePut,
});

export const DELETE = createApiHandler({
  permissions: ['customer.update'],
  handler: handleDelete,
});
