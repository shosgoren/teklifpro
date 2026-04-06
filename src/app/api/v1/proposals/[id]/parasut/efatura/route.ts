/**
 * POST /api/v1/proposals/[id]/parasut/efatura — Send e-fatura or e-arsiv for the linked invoice
 * GET  /api/v1/proposals/[id]/parasut/efatura — Check e-document status
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'
import { Logger } from '@/infrastructure/logger'
import type { ParasutEInvoiceCreateData, ParasutEArchiveCreateData } from '@/shared/types'

const logger = new Logger('ProposalEFaturaAPI')

const efaturaSchema = z.object({
  type: z.enum(['e_invoice', 'e_archive']),
  scenario: z.enum(['basic', 'commercial']).optional().default('basic'),
  receiverAlias: z.string().optional(), // PK for e-invoice
  note: z.string().optional(),
  vatWithholdingCode: z.string().optional(),
  vatExemptionReasonCode: z.string().optional(),
  vatExemptionReason: z.string().optional(),
})

/**
 * POST — Send e-fatura or e-arsiv through Parasut → GIB
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

    const body = await request.json()
    const validation = efaturaSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz parametreler', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { type, scenario, receiverAlias, note, vatWithholdingCode, vatExemptionReasonCode, vatExemptionReason } = validation.data

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId: session.tenant.id,
        deletedAt: null,
      },
      select: { parasutInvoiceId: true, status: true },
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      )
    }

    if (!proposal.parasutInvoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Önce teklifi faturaya dönüştürün',
          code: 'NOT_INVOICED',
        },
        { status: 400 }
      )
    }

    const client = await ParasutClient.forTenant(session.tenant.id)

    let eDocumentId: string

    if (type === 'e_invoice') {
      const eInvoiceBody: ParasutEInvoiceCreateData = {
        data: {
          type: 'e_invoices',
          attributes: {
            scenario,
            to: receiverAlias,
            note,
            vat_withholding_code: vatWithholdingCode,
            vat_exemption_reason_code: vatExemptionReasonCode,
            vat_exemption_reason: vatExemptionReason,
          },
          relationships: {
            invoice: {
              data: { id: proposal.parasutInvoiceId, type: 'sales_invoices' },
            },
          },
        },
      }

      const result = await client.createEInvoice(eInvoiceBody)
      eDocumentId = result.data.id
    } else {
      const eArchiveBody: ParasutEArchiveCreateData = {
        data: {
          type: 'e_archives',
          attributes: {
            note,
            vat_withholding_code: vatWithholdingCode,
            vat_exemption_reason_code: vatExemptionReasonCode,
            vat_exemption_reason: vatExemptionReason,
          },
          relationships: {
            invoice: {
              data: { id: proposal.parasutInvoiceId, type: 'sales_invoices' },
            },
          },
        },
      }

      const result = await client.createEArchive(eArchiveBody)
      eDocumentId = result.data.id
    }

    // Activity log
    await prisma.proposalActivity.create({
      data: {
        proposalId,
        type: type === 'e_invoice' ? 'E_FATURA_SENT' : 'E_ARSIV_SENT',
        description: type === 'e_invoice'
          ? 'GİB\'e e-fatura gönderildi'
          : 'GİB\'e e-arşiv fatura gönderildi',
        metadata: {
          eDocumentId,
          type,
          parasutInvoiceId: proposal.parasutInvoiceId,
        },
      },
    })

    // Sync log
    await prisma.parasutSyncLog.create({
      data: {
        tenantId: session.tenant.id,
        entityType: type === 'e_invoice' ? 'e_invoice' : 'e_archive',
        direction: 'PUSH',
        status: 'COMPLETED',
        recordCount: 1,
        errorCount: 0,
      },
    })

    logger.info(`E-document sent for proposal ${proposalId}`, { type, eDocumentId })

    return NextResponse.json({
      success: true,
      data: {
        proposalId,
        eDocumentId,
        type,
        status: 'processing',
        message: type === 'e_invoice'
          ? 'E-fatura GİB\'e gönderildi, işleniyor...'
          : 'E-arşiv fatura oluşturuldu, işleniyor...',
      },
    })
  } catch (error) {
    logger.error('POST /api/v1/proposals/[id]/parasut/efatura error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'

    if (message === 'PARASUT_NOT_CONFIGURED') {
      return NextResponse.json(
        { success: false, error: 'Paraşüt entegrasyonu yapılandırılmamış' },
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
 * GET — Check e-document status
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

    if (!proposal?.parasutInvoiceId) {
      return NextResponse.json(
        { success: false, error: 'Fatura bulunamadı' },
        { status: 400 }
      )
    }

    const client = await ParasutClient.forTenant(session.tenant.id)
    const invoiceStatus = await client.pullSalesInvoiceStatus(proposal.parasutInvoiceId)

    return NextResponse.json({
      success: true,
      data: {
        proposalId,
        parasutInvoiceId: proposal.parasutInvoiceId,
        eDocumentId: invoiceStatus.eDocumentId,
        eDocumentStatus: invoiceStatus.eDocumentStatus,
        paymentStatus: invoiceStatus.paymentStatus,
        invoiceNumber: invoiceStatus.invoiceNumber,
      },
    })
  } catch (error) {
    logger.error('GET /api/v1/proposals/[id]/parasut/efatura error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost, ['proposal.update', 'integration.sync'])
export const GET = withAuth(handleGet, ['proposal.read', 'integration.sync'])
