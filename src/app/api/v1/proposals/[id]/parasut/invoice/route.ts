/**
 * POST /api/v1/proposals/[id]/parasut/invoice — Convert proposal to Parasut sales invoice
 * GET  /api/v1/proposals/[id]/parasut/invoice — Pull invoice status from Parasut
 * DELETE /api/v1/proposals/[id]/parasut/invoice — Remove invoice link
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('ProposalInvoiceAPI')

/**
 * POST — Convert accepted proposal to Parasut sales invoice
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

    // Must be accepted or already have a Parasut offer
    if (proposal.status !== 'ACCEPTED' && proposal.status !== 'INVOICED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Sadece onaylanmış teklifler faturaya dönüştürülebilir',
          code: 'NOT_ACCEPTED',
        },
        { status: 400 }
      )
    }

    if (proposal.parasutInvoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bu teklif zaten faturaya dönüştürülmüş',
          code: 'ALREADY_INVOICED',
          data: { parasutInvoiceId: proposal.parasutInvoiceId },
        },
        { status: 400 }
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

    if (!proposal.parasutOfferId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Önce teklifi Paraşüt\'e gönderin (sales_offer oluşturun)',
          code: 'OFFER_NOT_SYNCED',
        },
        { status: 400 }
      )
    }

    const client = await ParasutClient.forTenant(session.tenant.id)

    const proposalData = {
      parasutOfferId: proposal.parasutOfferId,
      title: proposal.title,
      currency: proposal.currency,
      expiresAt: proposal.expiresAt,
      notes: proposal.notes,
      discountType: proposal.discountType,
      discountValue: proposal.discountValue ? Number(proposal.discountValue) : null,
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

    const parasutInvoiceId = await client.convertOfferToInvoice(proposalData)

    // Update proposal with invoice link
    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        parasutInvoiceId,
        parasutInvoiceSyncAt: new Date(),
        status: 'INVOICED',
      },
    })

    // Activity log
    await prisma.proposalActivity.create({
      data: {
        proposalId,
        type: 'INVOICED',
        description: 'Paraşüt üzerinden fatura oluşturuldu',
        metadata: { parasutInvoiceId, source: 'manual' },
      },
    })

    // Sync log
    await prisma.parasutSyncLog.create({
      data: {
        tenantId: session.tenant.id,
        entityType: 'sales_invoice',
        direction: 'PUSH',
        status: 'COMPLETED',
        recordCount: 1,
        errorCount: 0,
      },
    })

    logger.info(`Proposal ${proposalId} converted to invoice ${parasutInvoiceId}`)

    return NextResponse.json({
      success: true,
      data: {
        proposalId,
        parasutInvoiceId,
        status: 'INVOICED',
        syncedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('POST /api/v1/proposals/[id]/parasut/invoice error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'

    if (message === 'PARASUT_NOT_CONFIGURED') {
      return NextResponse.json(
        { success: false, error: 'Paraşüt entegrasyonu yapılandırılmamış', code: 'PARASUT_NOT_CONFIGURED' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * GET — Pull invoice status from Parasut
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
      select: { parasutInvoiceId: true },
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      )
    }

    if (!proposal.parasutInvoiceId) {
      return NextResponse.json(
        { success: false, error: 'Bu teklif henüz faturaya dönüştürülmemiş', code: 'NOT_INVOICED' },
        { status: 400 }
      )
    }

    const client = await ParasutClient.forTenant(session.tenant.id)
    const invoiceStatus = await client.pullSalesInvoiceStatus(proposal.parasutInvoiceId)

    await prisma.proposal.update({
      where: { id: proposalId },
      data: { parasutInvoiceSyncAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: {
        proposalId,
        parasutInvoiceId: proposal.parasutInvoiceId,
        ...invoiceStatus,
        lastSyncAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('GET /api/v1/proposals/[id]/parasut/invoice error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * DELETE — Remove invoice link from proposal
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
      select: { parasutInvoiceId: true },
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      )
    }

    if (!proposal.parasutInvoiceId) {
      return NextResponse.json(
        { success: false, error: 'Bu teklif zaten fatura ile bağlantılı değil' },
        { status: 400 }
      )
    }

    // Try to delete from Parasut too
    try {
      const client = await ParasutClient.forTenant(session.tenant.id)
      await client.deleteSalesInvoice(proposal.parasutInvoiceId)
    } catch {
      // Ignore - may already be deleted on Parasut side
    }

    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        parasutInvoiceId: null,
        parasutInvoiceSyncAt: null,
        status: 'ACCEPTED', // Revert to accepted
      },
    })

    return NextResponse.json({
      success: true,
      data: { proposalId, message: 'Fatura bağlantısı kaldırıldı' },
    })
  } catch (error) {
    logger.error('DELETE /api/v1/proposals/[id]/parasut/invoice error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost, ['proposal.update', 'integration.sync'])
export const GET = withAuth(handleGet, ['proposal.read', 'integration.sync'])
export const DELETE = withAuth(handleDelete, ['proposal.update', 'integration.sync'])
