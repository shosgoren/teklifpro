import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { paytrService, PayTRService } from '@/infrastructure/services/payment/PayTRService'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('PayTRWebhook')

/**
 * POST /api/v1/webhooks/paytr
 * PayTR payment callback handler
 * Handles both subscription and proposal payments
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const data: Record<string, unknown> = {}
    formData.forEach((value, key) => {
      data[key] = value
    })

    const merchantOid = String(data.merchant_oid || '')
    const status = String(data.status || '')
    const totalAmount = Number(data.total_amount || 0)
    const hash = String(data.hash || '')

    logger.info('PayTR webhook received', { merchantOid, status, totalAmount })

    // Verify webhook signature
    if (!paytrService.verifyWebhookHash({ merchant_oid: merchantOid, status, total_amount: totalAmount, hash })) {
      logger.warn('Invalid PayTR webhook signature', { merchantOid })
      return new NextResponse('FAIL', { status: 200 }) // PayTR expects 200 even on failure
    }

    // Handle proposal payments (PROP_{proposalId}_{timestamp})
    const proposalId = PayTRService.parseProposalIdFromOid(merchantOid)
    if (proposalId) {
      await handleProposalPayment(proposalId, merchantOid, status, totalAmount)
      return new NextResponse('OK', { status: 200 })
    }

    // Handle subscription payments (SUB_{tenantId}_{timestamp})
    if (merchantOid.startsWith('SUB_')) {
      const result = await paytrService.handlePaymentCallback({
        merchant_oid: merchantOid,
        status,
        total_amount: totalAmount,
        hash,
      })
      logger.info('Subscription payment handled', { result })
      return new NextResponse('OK', { status: 200 })
    }

    logger.warn('Unknown merchant_oid format', { merchantOid })
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    logger.error('PayTR webhook error', error)
    return new NextResponse('OK', { status: 200 }) // Always return 200 to PayTR
  }
}

async function handleProposalPayment(
  proposalId: string,
  merchantOid: string,
  status: string,
  totalAmount: number
) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { id: true, status: true, tenantId: true, proposalNumber: true },
  })

  if (!proposal) {
    logger.warn('Proposal not found for payment', { proposalId, merchantOid })
    return
  }

  if (status === 'success') {
    // Only update if proposal is in a state that can be accepted
    const acceptableStatuses = ['SENT', 'VIEWED', 'READY']
    if (!acceptableStatuses.includes(proposal.status)) {
      logger.info('Proposal already processed, skipping', { proposalId, currentStatus: proposal.status })
      return
    }

    await prisma.$transaction([
      prisma.proposal.update({
        where: { id: proposalId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
          customerNote: `Online ödeme ile kabul edildi (PayTR: ${merchantOid})`,
        },
      }),
      prisma.proposalActivity.create({
        data: {
          proposalId,
          type: 'ACCEPTED',
          description: `Online ödeme ile kabul edildi — ${(totalAmount / 100).toFixed(2)} TL`,
          metadata: {
            method: 'paytr',
            merchantOid,
            totalAmount,
            automatic: true,
          },
        },
      }),
    ])

    logger.info('Proposal accepted via PayTR payment', {
      proposalId,
      proposalNumber: proposal.proposalNumber,
      merchantOid,
      totalAmount,
    })
  } else {
    // Log failed payment attempt
    await prisma.proposalActivity.create({
      data: {
        proposalId,
        type: 'LINK_CLICKED',
        description: `Online ödeme başarısız (PayTR: ${merchantOid})`,
        metadata: {
          method: 'paytr',
          merchantOid,
          status: 'failed',
          automatic: true,
        },
      },
    })

    logger.warn('Proposal payment failed', { proposalId, merchantOid })
  }
}
