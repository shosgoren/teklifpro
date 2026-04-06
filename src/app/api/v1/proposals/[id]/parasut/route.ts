/**
 * POST /api/v1/proposals/[id]/parasut — Push proposal to Parasut as sales_offer
 * GET  /api/v1/proposals/[id]/parasut — Pull status from Parasut
 * DELETE /api/v1/proposals/[id]/parasut — Remove Parasut link
 */
import { NextRequest, NextResponse } from 'next/server'
import { ProposalStatus } from '@prisma/client'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('ProposalParasutAPI')

/**
 * POST — Push proposal to Parasut
 * Creates or updates the sales_offer in Parasut
 */
async function handlePost(
  request: NextRequest,
  context?: { params: Record<string, string> }
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!
    const proposalId = context?.params?.id

    if (!proposalId) {
      return NextResponse.json(
        { success: false, error: 'Proposal ID required' },
        { status: 400 }
      )
    }

    // Fetch proposal with customer and items
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId: session.tenant.id,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            parasutId: true,
            taxNumber: true,
            taxOffice: true,
            address: true,
            city: true,
            district: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: { parasutId: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      )
    }

    if (!proposal.customer.parasutId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Müşterinin Paraşüt ID\'si yok. Önce müşteriyi senkronize edin.',
          code: 'CUSTOMER_NOT_SYNCED',
        },
        { status: 400 }
      )
    }

    const client = await ParasutClient.forTenant(session.tenant.id)

    const proposalData = {
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      currency: proposal.currency,
      subtotal: Number(proposal.subtotal),
      discountType: proposal.discountType,
      discountValue: proposal.discountValue ? Number(proposal.discountValue) : null,
      grandTotal: Number(proposal.grandTotal),
      expiresAt: proposal.expiresAt,
      notes: proposal.notes,
      customer: {
        parasutId: proposal.customer.parasutId,
        taxNumber: proposal.customer.taxNumber,
        taxOffice: proposal.customer.taxOffice,
        address: proposal.customer.address,
        city: proposal.customer.city,
        district: proposal.customer.district,
        phone: proposal.customer.phone,
      },
      items: proposal.items.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: Number(item.vatRate),
        discountRate: Number(item.discountRate),
        product: item.product ? { parasutId: item.product.parasutId } : null,
      })),
    }

    let parasutOfferId: string

    if (proposal.parasutOfferId) {
      // Update existing offer in Parasut
      // We need to delete and recreate since Parasut PUT requires full details
      try {
        await client.deleteSalesOffer(proposal.parasutOfferId)
      } catch {
        // Ignore if already deleted on Parasut side
      }
      parasutOfferId = await client.pushProposal(proposalData)
    } else {
      parasutOfferId = await client.pushProposal(proposalData)
    }

    // Save Parasut offer ID to proposal
    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        parasutOfferId,
        parasutLastSyncAt: new Date(),
      },
    })

    // Create sync log
    await prisma.parasutSyncLog.create({
      data: {
        tenantId: session.tenant.id,
        entityType: 'sales_offer',
        direction: 'PUSH',
        status: 'COMPLETED',
        recordCount: 1,
        errorCount: 0,
      },
    })

    logger.info(`Proposal ${proposalId} pushed to Parasut as offer ${parasutOfferId}`)

    return NextResponse.json({
      success: true,
      data: {
        proposalId,
        parasutOfferId,
        syncedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('POST /api/v1/proposals/[id]/parasut error:', error)

    const message = error instanceof Error ? error.message : 'Internal server error'

    if (message === 'PARASUT_NOT_CONFIGURED') {
      return NextResponse.json(
        { success: false, error: 'Paraşüt entegrasyonu yapılandırılmamış', code: 'PARASUT_NOT_CONFIGURED' },
        { status: 400 }
      )
    }

    if (message === 'PARASUT_TOKEN_EXPIRED') {
      return NextResponse.json(
        { success: false, error: 'Paraşüt token süresi dolmuş', code: 'PARASUT_TOKEN_EXPIRED' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * GET — Pull proposal status from Parasut
 */
async function handleGet(
  request: NextRequest,
  context?: { params: Record<string, string> }
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!
    const proposalId = context?.params?.id

    if (!proposalId) {
      return NextResponse.json(
        { success: false, error: 'Proposal ID required' },
        { status: 400 }
      )
    }

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId: session.tenant.id,
        deletedAt: null,
      },
      select: { parasutOfferId: true, status: true },
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      )
    }

    if (!proposal.parasutOfferId) {
      return NextResponse.json(
        { success: false, error: 'Bu teklif Paraşüt ile senkronize değil', code: 'NOT_SYNCED' },
        { status: 400 }
      )
    }

    const client = await ParasutClient.forTenant(session.tenant.id)
    const parasutStatus = await client.pullSalesOfferStatus(proposal.parasutOfferId)

    // Map Parasut status to TeklifPro status
    const statusMap: Record<string, string> = {
      accepted: 'ACCEPTED',
      rejected: 'REJECTED',
      waiting: proposal.status, // Keep current status if waiting
    }

    const newStatus = statusMap[parasutStatus.status] || proposal.status

    // Update proposal if status changed
    if (newStatus !== proposal.status && parasutStatus.status !== 'waiting') {
      await prisma.proposal.update({
        where: { id: proposalId },
        data: {
          status: newStatus as ProposalStatus,
          respondedAt: new Date(),
          parasutLastSyncAt: new Date(),
        },
      })
    } else {
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { parasutLastSyncAt: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        proposalId,
        parasutOfferId: proposal.parasutOfferId,
        parasutStatus: parasutStatus.status,
        teklifproStatus: newStatus,
        netTotal: parasutStatus.netTotal,
        grossTotal: parasutStatus.grossTotal,
        totalVat: parasutStatus.totalVat,
        totalDiscount: parasutStatus.totalDiscount,
        lastSyncAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('GET /api/v1/proposals/[id]/parasut error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * DELETE — Remove Parasut link from proposal
 */
async function handleDelete(
  request: NextRequest,
  context?: { params: Record<string, string> }
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!
    const proposalId = context?.params?.id

    if (!proposalId) {
      return NextResponse.json(
        { success: false, error: 'Proposal ID required' },
        { status: 400 }
      )
    }

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId: session.tenant.id,
        deletedAt: null,
      },
      select: { parasutOfferId: true },
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      )
    }

    if (!proposal.parasutOfferId) {
      return NextResponse.json(
        { success: false, error: 'Bu teklif zaten Paraşüt ile bağlantılı değil' },
        { status: 400 }
      )
    }

    // Try to delete from Parasut too
    try {
      const client = await ParasutClient.forTenant(session.tenant.id)
      await client.deleteSalesOffer(proposal.parasutOfferId)
    } catch {
      // Ignore - may already be deleted on Parasut side
    }

    // Remove link from proposal
    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        parasutOfferId: null,
        parasutLastSyncAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      data: { proposalId, message: 'Paraşüt bağlantısı kaldırıldı' },
    })
  } catch (error) {
    logger.error('DELETE /api/v1/proposals/[id]/parasut error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost, ['proposal.update', 'integration.sync'])
export const GET = withAuth(handleGet, ['proposal.read', 'integration.sync'])
export const DELETE = withAuth(handleDelete, ['proposal.update', 'integration.sync'])
