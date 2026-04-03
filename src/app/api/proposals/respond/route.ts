import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { notifyProposalEvent } from '@/infrastructure/services/whatsapp/notifyProposalEvent'
import { withRateLimit } from '@/infrastructure/middleware/rateLimitMiddleware'
import { Logger } from '@/infrastructure/logger'
import { EmailService } from '@/infrastructure/services/email/EmailService'

const logger = new Logger('ProposalRespondAPI')

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json()
    const { proposalId, action, customerNote, rejectionReason, revisionNote, signatureData, signerName } = body

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

    // Find proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { user: true, customer: true },
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

    // Validate signature if provided
    if (signatureData) {
      if (!signatureData.startsWith('data:image/png;base64,')) {
        return NextResponse.json(
          { success: false, error: { message: 'Geçersiz imza formatı' } },
          { status: 400 }
        )
      }
      // Max 200KB for signature PNG
      const base64Part = signatureData.split(',')[1] || ''
      if (base64Part.length > 200 * 1024 * 1.37) {
        return NextResponse.json(
          { success: false, error: { message: 'İmza dosyası çok büyük' } },
          { status: 400 }
        )
      }
    }

    // Update proposal status
    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: action,
        respondedAt: new Date(),
        ...(action === 'ACCEPTED' && {
          customerNote: customerNote || null,
          signatureData: signatureData || null,
          signedAt: signatureData ? new Date() : null,
          signerName: signerName || null,
        }),
        ...(action === 'REJECTED' && { rejectionReason: rejectionReason || null }),
        ...(action === 'REVISION_REQUESTED' && { revisionNote: revisionNote || null }),
      },
    })

    // Log activity
    await prisma.proposalActivity.create({
      data: {
        proposalId,
        type: action,
        metadata: {
          timestamp: new Date().toISOString(),
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

export const POST = withRateLimit(handlePost, { requestsPerMinute: 10 });
