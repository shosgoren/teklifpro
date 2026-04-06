/**
 * POST /api/v1/proposals/[id]/parasut/pdf — Generate PDF via Parasut
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('ProposalParasutPdfAPI')

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
      select: { parasutOfferId: true },
    })

    if (!proposal?.parasutOfferId) {
      return NextResponse.json(
        { success: false, error: 'Teklif önce Paraşüt\'e gönderilmeli', code: 'NOT_SYNCED' },
        { status: 400 }
      )
    }

    const client = await ParasutClient.forTenant(session.tenant.id)

    // Trigger PDF generation (returns a trackable job)
    const job = await client.generateSalesOfferPdf(proposal.parasutOfferId)

    // Poll for completion (max 10 seconds)
    let pdfUrl: string | null = null
    const jobId = job.data.id

    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      try {
        const status = await client.getTrackableJob(jobId)
        if (status.data.attributes.url && status.data.attributes.status === 'done') {
          pdfUrl = status.data.attributes.url
          break
        }
        if (status.data.attributes.result) {
          pdfUrl = status.data.attributes.result
          break
        }
      } catch {
        // Job not ready yet
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        proposalId,
        parasutOfferId: proposal.parasutOfferId,
        jobId,
        pdfUrl,
        status: pdfUrl ? 'ready' : 'processing',
      },
    })
  } catch (error) {
    logger.error('POST /api/v1/proposals/[id]/parasut/pdf error:', error)
    return NextResponse.json(
      { success: false, error: 'PDF oluşturulamadı' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost, ['proposal.read', 'integration.sync'])
