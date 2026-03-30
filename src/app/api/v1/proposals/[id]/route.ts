import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';

// Validation schemas
const UpdateProposalSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'EXPIRED']).optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    productId: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    unit: z.string().default('Adet'),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    discountRate: z.number().min(0).max(100).default(0),
    vatRate: z.number().min(0).max(100).default(18),
  })).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  customerId: z.string().optional(),
});

type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>;

/**
 * GET /api/v1/proposals/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposalId = params.id;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId, deletedAt: null },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                listPrice: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
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
      data: proposal,
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
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposalId = params.id;
    const body = await request.json();

    const validatedData = UpdateProposalSchema.parse(body);

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
    let subtotal = Number(existingProposal.subtotal);
    let discountAmount = Number(existingProposal.discountAmount);
    let vatTotal = Number(existingProposal.vatTotal);
    let grandTotal = Number(existingProposal.grandTotal);

    if (validatedData.items && validatedData.items.length > 0) {
      const calculations = calculateTotals(validatedData.items);
      subtotal = calculations.subtotal;
      discountAmount = calculations.discountAmount;
      vatTotal = calculations.vatTotal;
      grandTotal = calculations.grandTotal;
    }

    const updatedProposal = await prisma.$transaction(async (tx) => {
      // Create revision snapshot if content changed
      if (validatedData.title || validatedData.items || validatedData.notes) {
        const revisionCount = await tx.proposalRevision.count({
          where: { proposalId },
        });
        await tx.proposalRevision.create({
          data: {
            proposalId,
            version: revisionCount + 1,
            snapshot: {
              title: existingProposal.title,
              description: existingProposal.description,
              subtotal: Number(existingProposal.subtotal),
              discountAmount: Number(existingProposal.discountAmount),
              vatTotal: Number(existingProposal.vatTotal),
              grandTotal: Number(existingProposal.grandTotal),
              notes: existingProposal.notes,
            },
            changedBy: 'system',
          },
        });
      }

      // Delete existing items if new items provided
      if (validatedData.items) {
        await tx.proposalItem.deleteMany({
          where: { proposalId },
        });
      }

      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          title: validatedData.title ?? undefined,
          description: validatedData.description ?? undefined,
          status: validatedData.status ?? undefined,
          notes: validatedData.notes ?? undefined,
          paymentTerms: validatedData.paymentTerms ?? undefined,
          deliveryTerms: validatedData.deliveryTerms ?? undefined,
          subtotal,
          discountAmount,
          vatTotal,
          grandTotal,
          ...(validatedData.items && {
            items: {
              createMany: {
                data: validatedData.items.map((item, index) => ({
                  productId: item.productId,
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
            },
          }),
        },
        include: {
          customer: true,
          items: { orderBy: { sortOrder: 'asc' } },
          activities: true,
          revisions: { take: 5 },
        },
      });

      await tx.proposalActivity.create({
        data: {
          proposalId,
          type: 'UPDATED',
          description: 'Teklif guncellendi',
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
      data: updatedProposal,
      message: 'Proposal updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
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
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposalId = params.id;

    const existingProposal = await prisma.proposal.findUnique({
      where: { id: proposalId, deletedAt: null },
    });

    if (!existingProposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    await prisma.proposal.update({
      where: { id: proposalId },
      data: { deletedAt: new Date() },
    });

    await prisma.proposalActivity.create({
      data: {
        proposalId,
        type: 'CANCELLED',
        description: 'Teklif silindi',
      },
    });

    return NextResponse.json({
      success: true,
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

function calculateTotals(items: Array<{
  quantity: number;
  unitPrice: number;
  discountRate: number;
  vatRate: number;
}>) {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalVat = 0;

  items.forEach((item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = (itemSubtotal * item.discountRate) / 100;
    const itemBeforeVat = itemSubtotal - itemDiscount;
    const itemVat = (itemBeforeVat * item.vatRate) / 100;

    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    totalVat += itemVat;
  });

  return {
    subtotal,
    discountAmount: totalDiscount,
    vatTotal: totalVat,
    grandTotal: subtotal - totalDiscount + totalVat,
  };
}
