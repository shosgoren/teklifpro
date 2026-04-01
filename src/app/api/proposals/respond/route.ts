import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { notifyProposalEvent } from '@/infrastructure/services/whatsapp/notifyProposalEvent'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { proposalId, action, customerNote, rejectionReason, revisionNote } = body

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

    // Update proposal status
    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: action,
        ...(action === 'ACCEPTED' && { customerNote: customerNote || null }),
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

    return NextResponse.json({
      success: true,
      data: { status: updatedProposal.status },
    })
  } catch (error) {
    console.error('Proposal respond error:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Bir hata oluştu' } },
      { status: 500 }
    )
  }
}
