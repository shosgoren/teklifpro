import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { paytrService } from '@/infrastructure/services/payment/PayTRService'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('ProposalPaymentAPI')

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.teklifpro.com'

/**
 * POST /api/proposals/payment
 * Public endpoint — generates PayTR iFrame token for a proposal
 * Only works for OFFICIAL proposals that haven't been accepted yet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { publicToken } = body

    if (!publicToken) {
      return NextResponse.json({ error: 'publicToken gerekli' }, { status: 400 })
    }

    const proposal = await prisma.proposal.findUnique({
      where: { publicToken },
      include: {
        customer: { select: { name: true, email: true, phone: true, address: true } },
      },
    })

    if (!proposal || proposal.deletedAt) {
      return NextResponse.json({ error: 'Teklif bulunamadı' }, { status: 404 })
    }

    if (proposal.proposalType !== 'OFFICIAL') {
      return NextResponse.json({ error: 'Gayri resmi teklifler için online ödeme yapılamaz' }, { status: 400 })
    }

    const nonPayableStatuses = ['ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'INVOICED']
    if (nonPayableStatuses.includes(proposal.status)) {
      return NextResponse.json({ error: 'Bu teklif için ödeme yapılamaz' }, { status: 400 })
    }

    // Amount in kuruş (100 = 1 TL)
    const amountKurus = Math.round(Number(proposal.grandTotal) * 100)

    if (amountKurus <= 0) {
      return NextResponse.json({ error: 'Geçersiz tutar' }, { status: 400 })
    }

    const userIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1'

    const result = paytrService.createProposalPaymentToken({
      proposalId: proposal.id,
      proposalNumber: proposal.proposalNumber,
      amount: amountKurus,
      currency: proposal.currency,
      customerEmail: proposal.customer?.email || 'customer@teklifpro.com',
      customerName: proposal.customer?.name || 'Müşteri',
      customerPhone: proposal.customer?.phone || '-',
      customerAddress: proposal.customer?.address || '-',
      userIp,
      okUrl: `${APP_URL}/proposal/${publicToken}?payment=success`,
      failUrl: `${APP_URL}/proposal/${publicToken}?payment=failed`,
    })

    logger.info('Payment token generated for proposal', {
      proposalId: proposal.id,
      proposalNumber: proposal.proposalNumber,
      merchantOid: result.merchantOid,
      amount: amountKurus,
    })

    return NextResponse.json({
      success: true,
      data: {
        token: result.token,
        merchantOid: result.merchantOid,
        merchantId: result.merchantId,
      },
    })
  } catch (error) {
    logger.error('Payment token generation error', error)
    return NextResponse.json(
      { error: 'Ödeme token oluşturulamadı' },
      { status: 500 }
    )
  }
}
