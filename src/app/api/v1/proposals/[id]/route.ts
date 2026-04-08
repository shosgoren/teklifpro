import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { UpdateProposalSchema, type UpdateProposalInput } from '@/shared/validations/proposal';
import { parseJsonBody, PayloadTooLargeError } from '@/shared/utils/requestSize';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ProposalDetailAPI');

/**
 * GET /api/v1/proposals/[id]
 */
async function handleGet(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const params = context!.params;

    const proposalId = params.id;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId, tenantId: session.tenant.id, deletedAt: null },
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
    logger.error('GET /api/v1/proposals/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/proposals/[id]
 */
async function handlePut(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const params = context!.params;

    const proposalId = params.id;
    const body = await parseJsonBody(request, 2_097_152); // 2MB limit (voice notes with base64)

    const validatedData = UpdateProposalSchema.parse(body);

    const existingProposal = await prisma.proposal.findUnique({
      where: { id: proposalId, tenantId: session.tenant.id, deletedAt: null },
    });

    if (!existingProposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    if (validatedData.status) {
      const VALID_TRANSITIONS: Record<string, string[]> = {
        DRAFT: ['READY', 'CANCELLED'],
        READY: ['DRAFT', 'SENT', 'CANCELLED'],
        SENT: ['VIEWED', 'EXPIRED', 'CANCELLED'],
        VIEWED: ['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'EXPIRED'],
        ACCEPTED: ['INVOICED'],
        REJECTED: ['DRAFT'],
        REVISION_REQUESTED: ['DRAFT', 'REVISED'],
        REVISED: ['READY', 'SENT', 'CANCELLED'],
        EXPIRED: ['DRAFT'],
      };
      const allowed = VALID_TRANSITIONS[existingProposal.status] || [];
      if (!allowed.includes(validatedData.status)) {
        return NextResponse.json(
          { success: false, error: `"${existingProposal.status}" durumundan "${validatedData.status}" durumuna geçiş yapılamaz.` },
          { status: 400 }
        );
      }
    }

    // Calculate totals if items are provided
    let subtotal = Number(existingProposal.subtotal);
    let discountAmount = Number(existingProposal.discountAmount);
    let vatTotal = Number(existingProposal.vatTotal);
    let grandTotal = Number(existingProposal.grandTotal);

    const generalDiscount = validatedData.discountType && validatedData.discountValue !== undefined
      ? { type: validatedData.discountType as 'PERCENTAGE' | 'FIXED', value: validatedData.discountValue }
      : undefined;

    if (validatedData.items && validatedData.items.length > 0) {
      const calculations = calculateTotals(validatedData.items, generalDiscount);
      subtotal = calculations.subtotal;
      discountAmount = calculations.discountAmount;
      vatTotal = calculations.vatTotal;
      grandTotal = calculations.grandTotal;
    } else if (generalDiscount) {
      // Recalculate with existing items but new general discount
      const existingItems = await prisma.proposalItem.findMany({ where: { proposalId } });
      const itemsForCalc = existingItems.map(i => ({
        quantity: Number(i.quantity), unitPrice: Number(i.unitPrice),
        discountRate: Number(i.discountRate), vatRate: Number(i.vatRate),
      }));
      const calculations = calculateTotals(itemsForCalc, generalDiscount);
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
          discountType: validatedData.discountType ?? undefined,
          discountValue: validatedData.discountValue ?? undefined,
          voiceNoteData: validatedData.voiceNoteData !== undefined ? (validatedData.voiceNoteData || null) : undefined,
          voiceNoteDuration: validatedData.voiceNoteDuration !== undefined ? (validatedData.voiceNoteDuration || null) : undefined,
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
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 413 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('PUT /api/v1/proposals/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/proposals/[id]
 */
async function handleDelete(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const params = context!.params;

    const proposalId = params.id;

    const existingProposal = await prisma.proposal.findUnique({
      where: { id: proposalId, tenantId: session.tenant.id, deletedAt: null },
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
    logger.error('DELETE /api/v1/proposals/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

function calculateTotals(
  items: Array<{
    quantity: number;
    unitPrice: number;
    discountRate: number;
    vatRate: number;
  }>,
  generalDiscount?: { type: 'PERCENTAGE' | 'FIXED'; value: number }
) {
  let subtotal = 0;
  let itemDiscountTotal = 0;
  let totalVat = 0;

  items.forEach((item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = (itemSubtotal * item.discountRate) / 100;
    const itemBeforeVat = itemSubtotal - itemDiscount;
    const itemVat = (itemBeforeVat * item.vatRate) / 100;

    subtotal += itemSubtotal;
    itemDiscountTotal += itemDiscount;
    totalVat += itemVat;
  });

  // Apply general discount
  let generalDiscountAmount = 0;
  if (generalDiscount && generalDiscount.value > 0) {
    const afterItemDiscount = subtotal - itemDiscountTotal;
    if (generalDiscount.type === 'PERCENTAGE') {
      generalDiscountAmount = afterItemDiscount * (generalDiscount.value / 100);
    } else {
      generalDiscountAmount = Math.min(generalDiscount.value, afterItemDiscount);
    }
    // Adjust VAT proportionally
    if (afterItemDiscount > 0) {
      totalVat = totalVat * ((afterItemDiscount - generalDiscountAmount) / afterItemDiscount);
    }
  }

  const totalDiscount = itemDiscountTotal + generalDiscountAmount;

  return {
    subtotal,
    discountAmount: totalDiscount,
    vatTotal: totalVat,
    grandTotal: subtotal - totalDiscount + totalVat,
  };
}

export const GET = withAuth(handleGet, ['proposal.read']);
export const PUT = withAuth(handlePut, ['proposal.update']);
export const DELETE = withAuth(handleDelete, ['proposal.delete']);
