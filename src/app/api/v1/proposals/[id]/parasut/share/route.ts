/**
 * POST /api/v1/proposals/[id]/parasut/share — Send proposal via Parasut email
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'
import { Logger } from '@/infrastructure/logger'
import type { ParasutSharingData } from '@/shared/types'

const logger = new Logger('ProposalParasutShareAPI')

const shareSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().max(5000).optional(),
})

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

    const reqBody = await request.json()
    const data = shareSchema.parse(reqBody)

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId: session.tenant.id,
        deletedAt: null,
      },
      select: {
        parasutOfferId: true,
        title: true,
        proposalNumber: true,
        customer: { select: { name: true } },
      },
    })

    if (!proposal?.parasutOfferId) {
      return NextResponse.json(
        { success: false, error: 'Teklif önce Paraşüt\'e gönderilmeli', code: 'NOT_SYNCED' },
        { status: 400 }
      )
    }

    const client = await ParasutClient.forTenant(session.tenant.id)

    const subject = data.subject || `Teklif: ${proposal.title} (${proposal.proposalNumber})`
    const body = data.body || `Sayın ${proposal.customer.name},\n\n${proposal.title} başlıklı teklifimizi incelemenize sunarız.\n\nSaygılarımızla`

    const sharingData: ParasutSharingData = {
      data: {
        type: 'sharing_forms',
        attributes: {
          email: {
            addresses: data.email,
            subject,
            body,
          },
          portal: {
            has_online_collection: false,
            has_online_payment_reminder: false,
            has_referral_link: false,
          },
        },
        relationships: {
          shareable: {
            data: {
              id: proposal.parasutOfferId,
              type: 'sales_offers',
            },
          },
        },
      },
    }

    const result = await client.shareSalesOffer(sharingData)

    logger.info(`Proposal ${proposalId} shared via Parasut to ${data.email}`)

    return NextResponse.json({
      success: true,
      data: {
        proposalId,
        sharedTo: data.email,
        subject,
        sharingId: result.data.id || null,
      },
    })
  } catch (error) {
    logger.error('POST /api/v1/proposals/[id]/parasut/share error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz giriş', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'E-posta gönderilemedi' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost, ['proposal.send', 'integration.sync'])
