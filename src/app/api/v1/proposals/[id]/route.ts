import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const UpdateProposalSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'EXPIRED']).optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    productId: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    discount: z.number().min(0).max(100).default(0),
    vatRate: z.number().min(0).max(100).default(18),
  })).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  customerId: z.string().optional(),
});

type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>;

interface ProposalItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  lineTotal?: number;
}

interface ProposalResponse {
  id: string;
  number: string;
  status: string;
  customerId: string;
  title: string;
  description: string;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  notes: string;
  terms: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  items?: ProposalItem[];
  activities?: object[];
  revisions?: object[];
}

/**
 * GET /api/v1/proposals/[id]
 * Retrieve a single proposal by ID with all relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposalId = params.id;

    // Validate UUID format
    if (!isValidUUID(proposalId)) {
      return NextResponse.json(
        { error: 'Invalid proposal ID format' },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId, deletedAt: null },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
        },
        revisions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatProposal(proposal),
    });
  } catch (error) {
    console.error('GET /api/v1/proposals/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/proposals/[id]
 * Update proposal with recalculation of totals and revision snapshot
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposalId = params.id;
    const body = await request.json();

    // Validate UUID format
    if (!isValidUUID(proposalId)) {
      return NextResponse.json(
        { error: 'Invalid proposal ID format' },
        { status: 400 }
      );
    }

    // Validate input
    const validatedData = UpdateProposalSchema.parse(body);

    // Check if proposal exists
    const existingProposal = await prisma.proposal.findUnique({
      where: { id: proposalId, deletedAt: null },
    });

    if (!existingProposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Calculate totals if items are provided
    let subtotal = existingProposal.subtotal;
    let discountAmount = existingProposal.discountAmount;
    let vatAmount = existingProposal.vatAmount;
    let total = existingProposal.total;

    if (validatedData.items && validatedData.items.length > 0) {
      const calculations = calculateProposalTotals(validatedData.items);
      subtotal = calculations.subtotal;
      discountAmount = calculations.discountAmount;
      vatAmount = calculations.vatAmount;
      total = calculations.total;
    }

    // Start transaction for atomic update
    const updatedProposal = await prisma.$transaction(async (tx) => {
      // Create revision snapshot if content changed
      if (
        validatedData.title ||
        validatedData.items ||
        validatedData.notes ||
        validatedData.terms
      ) {
        await tx.proposalRevision.create({
          data: {
            proposalId,
            previousData: {
              title: existingProposal.title,
              description: existingProposal.description,
              subtotal: existingProposal.subtotal,
              discountAmount: existingProposal.discountAmount,
              vatAmount: existingProposal.vatAmount,
              total: existingProposal.total,
              notes: existingProposal.notes,
              terms: existingProposal.terms,
            },
            changedBy: 'system', // Should be replaced with actual user ID
          },
        });
      }

      // Delete existing items if new items provided
      if (validatedData.items) {
        await tx.proposalItem.deleteMany({
          where: { proposalId },
        });
      }

      // Update proposal
      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          title: validatedData.title ?? undefined,
          description: validatedData.description ?? undefined,
          status: validatedData.status ?? undefined,
          notes: validatedData.notes ?? undefined,
          terms: validatedData.terms ?? undefined,
          subtotal,
          discountAmount,
          vatAmount,
          total,
          updatedAt: new Date(),
          // Create new items if provided
          ...(validatedData.items && {
            items: {
              createMany: {
                data: validatedData.items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  discount: item.discount,
                  vatRate: item.vatRate,
                })),
              },
            },
          }),
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
          activities: true,
          revisions: { take: 5 },
        },
      });

      // Create activity log
      await tx.proposalActivity.create({
        data: {
          proposalId,
          type: 'UPDATED',
          description: 'Teklif güncellendi',
          metadata: {
            changes: Object.keys(validatedData).filter(
              (key) => validatedData[key as keyof UpdateProposalInput] !== undefined
            ),
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: formatProposal(updatedProposal),
      message: 'Proposal updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('PUT /api/v1/proposals/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/proposals/[id]
 * Soft delete proposal (set deletedAt timestamp)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposalId = params.id;

    // Validate UUID format
    if (!isValidUUID(proposalId)) {
      return NextResponse.json(
        { error: 'Invalid proposal ID format' },
        { status: 400 }
      );
    }

    // Check if proposal exists
    const existingProposal = await prisma.proposal.findUnique({
      where: { id: proposalId, deletedAt: null },
    });

    if (!existingProposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Soft delete
    const deletedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Create activity log
    await prisma.proposalActivity.create({
      data: {
        proposalId,
        type: 'DELETED',
        description: 'Teklif silindi',
      },
    });

    return NextResponse.json({
      success: true,
      data: formatProposal(deletedProposal),
      message: 'Proposal deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/v1/proposals/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

interface ProposalItemInput {
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
}

interface TotalCalculation {
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
}

function calculateProposalTotals(items: ProposalItemInput[]): TotalCalculation {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalVat = 0;

  items.forEach((item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = (itemSubtotal * item.discount) / 100;
    const itemBeforeVat = itemSubtotal - itemDiscount;
    const itemVat = (itemBeforeVat * item.vatRate) / 100;

    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    totalVat += itemVat;
  });

  return {
    subtotal,
    discountAmount: totalDiscount,
    vatAmount: totalVat,
    total: subtotal - totalDiscount + totalVat,
  };
}

function formatProposal(proposal: any): ProposalResponse {
  return {
    id: proposal.id,
    number: proposal.number,
    status: proposal.status,
    customerId: proposal.customerId,
    title: proposal.title,
    description: proposal.description,
    subtotal: proposal.subtotal,
    discountAmount: proposal.discountAmount,
    vatAmount: proposal.vatAmount,
    total: proposal.total,
    notes: proposal.notes,
    terms: proposal.terms,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
    deletedAt: proposal.deletedAt ? proposal.deletedAt.toISOString() : null,
    ...(proposal.items && { items: proposal.items }),
    ...(proposal.activities && { activities: proposal.activities }),
    ...(proposal.revisions && { revisions: proposal.revisions }),
  };
}
