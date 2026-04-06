import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/shared/utils/prisma'
import { encryptSignature } from '@/shared/utils/signatureCrypto'
import { notifyProposalEvent } from '@/infrastructure/services/whatsapp/notifyProposalEvent'
import { withRateLimit } from '@/infrastructure/middleware/rateLimitMiddleware'
import { Logger } from '@/infrastructure/logger'
import { EmailService } from '@/infrastructure/services/email/EmailService'
import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'

const logger = new Logger('ProposalRespondAPI')

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json()
    const { proposalId, action, customerNote, rejectionReason, revisionNote, signatureData, signerName, contactId } = body

    if (!proposalId || !action) {
      return NextResponse.json(
        { success: false, error: { message: 'proposalId ve action zorunludur' } },
        { status: 400 }
      )
    }

    const validActions = ['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: { message: 'Geçersiz aksiyon' } },
        { status: 400 }
      )
    }

    // Find proposal with items for potential Parasut invoice creation
    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, deletedAt: null },
      include: {
        user: true,
        customer: true,
        items: { include: { product: true } },
      },
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: { message: 'Teklif bulunamadı' } },
        { status: 404 }
      )
    }

    // Check if already responded
    if (['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED'].includes(proposal.status)) {
      return NextResponse.json(
        { success: false, error: { message: 'Bu teklife zaten yanıt verilmiş' } },
        { status: 400 }
      )
    }

    // Check if proposal has expired
    if (proposal.expiresAt && new Date(proposal.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: { message: 'Bu teklifin süresi dolmuştur' } },
        { status: 400 }
      )
    }

    // Validate signature - required for acceptance
    if (action === 'ACCEPTED') {
      if (!signerName?.trim()) {
        return NextResponse.json(
          { success: false, error: { message: 'Kabul için ad soyad zorunludur' } },
          { status: 400 }
        )
      }
      if (!signatureData) {
        return NextResponse.json(
          { success: false, error: { message: 'Kabul için imza zorunludur' } },
          { status: 400 }
        )
      }
      if (!signatureData.startsWith('data:image/png;base64,')) {
        return NextResponse.json(
          { success: false, error: { message: 'Geçersiz imza formatı' } },
          { status: 400 }
        )
      }
      const base64Part = signatureData.split(',')[1] || ''
      if (base64Part.length > 200 * 1024 * 1.37) {
        return NextResponse.json(
          { success: false, error: { message: 'İmza dosyası çok büyük' } },
          { status: 400 }
        )
      }
    }

    // Collect client info for legal audit trail
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Compute signature hash for integrity verification
    const signatureHash = signatureData
      ? crypto.createHash('sha256').update(signatureData).digest('hex')
      : null

    // Encrypt signature data before storage
    const encryptedSignature = signatureData ? encryptSignature(signatureData) : null

    // Update proposal status
    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: action,
        respondedAt: new Date(),
        ...(action === 'ACCEPTED' && {
          customerNote: customerNote || null,
          signatureData: encryptedSignature,
          signedAt: new Date(),
          signerName: signerName.trim(),
          ...(contactId && { contactId }),
        }),
        ...(action === 'REJECTED' && { rejectionReason: rejectionReason || null }),
        ...(action === 'REVISION_REQUESTED' && { revisionNote: revisionNote || null }),
      },
    })

    // Log activity with audit trail
    await prisma.proposalActivity.create({
      data: {
        proposalId,
        type: action,
        metadata: {
          timestamp: new Date().toISOString(),
          clientIp,
          userAgent,
          ...(signatureHash && { signatureHash }),
          ...(signerName && { signerName: signerName.trim() }),
          ...(customerNote && { customerNote }),
          ...(rejectionReason && { rejectionReason }),
          ...(revisionNote && { revisionNote }),
        },
      },
    })

    // Send real-time WhatsApp notification to proposal owner (fire-and-forget)
    notifyProposalEvent({
      proposalId,
      eventType: action as 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED',
      customerNote,
      rejectionReason,
      revisionNote,
    }).catch(() => {})

    // Send email notification to proposal owner (fire-and-forget)
    const emailService = new EmailService()
    const proposalData = {
      id: proposal.id,
      number: proposal.proposalNumber || proposal.id,
      clientName: proposal.customer?.name || 'Müşteri',
      clientEmail: proposal.customer?.email || '',
      amount: Number(proposal.grandTotal) || 0,
      currency: proposal.currency || 'TRY',
      validUntil: proposal.expiresAt || new Date(),
    }

    if (action === 'ACCEPTED') {
      emailService.sendProposalAccepted(proposal.user.email, proposalData).catch(() => {})

      // Auto-create draft invoice in Parasut (fire-and-forget)
      createParasutDraftInvoice(proposal).catch((err) => {
        logger.error(`Auto Parasut invoice failed for proposal ${proposalId}`, err)
      })
    } else if (action === 'REJECTED') {
      emailService.sendProposalRejected(proposal.user.email, proposalData).catch(() => {})
    } else if (action === 'REVISION_REQUESTED') {
      emailService.sendProposalRevisionRequested(proposal.user.email, proposalData, revisionNote || '').catch(() => {})
    }

    return NextResponse.json({
      success: true,
      data: { status: updatedProposal.status },
    })
  } catch (error) {
    logger.error('Proposal respond error', error)
    return NextResponse.json(
      { success: false, error: { message: 'Bir hata oluştu' } },
      { status: 500 }
    )
  }
}

/**
 * Auto-create a draft sales invoice in Parasut when proposal is accepted.
 * Runs fire-and-forget — failures are logged but don't block the response.
 */
async function createParasutDraftInvoice(proposal: {
  id: string
  tenantId: string
  title: string
  currency: string
  expiresAt: Date | null
  notes: string | null
  parasutOfferId: string | null
  discountType: string | null
  discountValue: { toNumber?: () => number } | number | null
  customer: {
    parasutId: string | null
    taxNumber: string | null
    taxOffice: string | null
    address: string | null
    city: string | null
    district: string | null
    phone: string | null
  } | null
  items: Array<{
    name: string
    description: string | null
    quantity: { toNumber?: () => number } | number
    unitPrice: { toNumber?: () => number } | number
    vatRate: { toNumber?: () => number } | number
    discountRate: { toNumber?: () => number } | number
    product: { parasutId: string | null } | null
  }>
}) {
  // Skip if customer not synced to Parasut
  if (!proposal.customer?.parasutId) {
    logger.info(`Skipping auto-invoice for ${proposal.id}: customer has no parasutId`)
    return
  }

  let client: ParasutClient
  try {
    client = await ParasutClient.forTenant(proposal.tenantId)
  } catch {
    logger.info(`Skipping auto-invoice for ${proposal.id}: Parasut not configured for tenant`)
    return
  }

  const toNum = (v: { toNumber?: () => number } | number | null | undefined): number =>
    v == null ? 0 : typeof v === 'number' ? v : (v.toNumber?.() ?? Number(v))

  const invoiceData = {
    parasutOfferId: proposal.parasutOfferId || '',
    title: proposal.title,
    currency: proposal.currency,
    expiresAt: proposal.expiresAt,
    notes: proposal.notes,
    discountType: proposal.discountType,
    discountValue: proposal.discountValue ? toNum(proposal.discountValue) : null,
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
      quantity: toNum(item.quantity),
      unitPrice: toNum(item.unitPrice),
      vatRate: toNum(item.vatRate),
      discountRate: toNum(item.discountRate),
      product: item.product,
    })),
  }

  const parasutInvoiceId = await client.convertOfferToInvoice(invoiceData)

  // Update proposal with invoice ID and status
  await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      parasutInvoiceId,
      parasutInvoiceSyncAt: new Date(),
      status: 'INVOICED',
    },
  })

  // Log the activity
  await prisma.proposalActivity.create({
    data: {
      proposalId: proposal.id,
      type: 'INVOICED',
      description: 'Teklif kabul edildi, Paraşüt\'te otomatik taslak fatura oluşturuldu',
      metadata: {
        parasutInvoiceId,
        parasutOfferId: proposal.parasutOfferId,
        automatic: true,
      },
    },
  })

  // Sync log
  await prisma.parasutSyncLog.create({
    data: {
      tenantId: proposal.tenantId,
      entityType: 'sales_invoice',
      direction: 'PUSH',
      status: 'COMPLETED',
      recordCount: 1,
      errorCount: 0,
    },
  })

  logger.info(`Auto-created Parasut draft invoice ${parasutInvoiceId} for proposal ${proposal.id}`)
}

export const POST = withRateLimit(handlePost, { requestsPerMinute: 10 });
