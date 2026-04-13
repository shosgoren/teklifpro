import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('PublicDateChangeAPI')

/**
 * POST /api/proposals/date-change
 * Public endpoint - customer requests a date change for their proposal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, requestType, requestedDate, customerNote } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: 'Token gerekli' } },
        { status: 400 }
      )
    }

    if (!requestType || !['DELIVERY', 'INSTALLATION'].includes(requestType)) {
      return NextResponse.json(
        { success: false, error: { message: 'Geçersiz talep türü' } },
        { status: 400 }
      )
    }

    if (!requestedDate) {
      return NextResponse.json(
        { success: false, error: { message: 'Talep edilen tarih gerekli' } },
        { status: 400 }
      )
    }

    const parsedDate = new Date(requestedDate)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { message: 'Geçersiz tarih formatı' } },
        { status: 400 }
      )
    }

    // Find proposal by publicToken
    const proposal = await prisma.proposal.findFirst({
      where: { publicToken: token, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        deliveryDate: true,
        installationDate: true,
      },
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: { message: 'Teklif bulunamadı' } },
        { status: 404 }
      )
    }

    // Check the proposal has a current date for the requested type
    const currentDate = requestType === 'DELIVERY'
      ? proposal.deliveryDate
      : proposal.installationDate

    if (!currentDate) {
      return NextResponse.json(
        { success: false, error: { message: 'Bu teklif türü için tarih bulunmuyor' } },
        { status: 400 }
      )
    }

    // Check for existing PENDING request for the same proposal + requestType
    const existingPending = await prisma.dateChangeRequest.findFirst({
      where: {
        proposalId: proposal.id,
        requestType,
        status: 'PENDING',
      },
    })

    if (existingPending) {
      return NextResponse.json(
        { success: false, error: { message: 'Bu tarih için bekleyen bir talep zaten var' } },
        { status: 409 }
      )
    }

    // Check capacity - is the requested date fully booked?
    const tenant = await prisma.tenant.findUnique({
      where: { id: proposal.tenantId },
      select: { dailyDeliveryCapacity: true, dailyInstallationCapacity: true },
    })

    const capacity = requestType === 'DELIVERY'
      ? (tenant?.dailyDeliveryCapacity ?? 1)
      : (tenant?.dailyInstallationCapacity ?? 1)

    const dateKey = parsedDate.toISOString().slice(0, 10)
    const dayStart = new Date(dateKey + 'T00:00:00.000Z')
    const dayEnd = new Date(dateKey + 'T23:59:59.999Z')

    const dateField = requestType === 'DELIVERY' ? 'deliveryDate' : 'installationDate'

    const bookedCount = await prisma.proposal.count({
      where: {
        tenantId: proposal.tenantId,
        deletedAt: null,
        id: { not: proposal.id },
        status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
        [dateField]: { gte: dayStart, lte: dayEnd },
      },
    })

    if (bookedCount >= capacity) {
      return NextResponse.json(
        { success: false, error: { message: 'Seçilen tarih dolu' } },
        { status: 409 }
      )
    }

    // Create the DateChangeRequest record
    const dateChangeRequest = await prisma.dateChangeRequest.create({
      data: {
        proposalId: proposal.id,
        requestType,
        currentDate,
        requestedDate: parsedDate,
        customerNote: customerNote || null,
      },
    })

    // Create ProposalActivity
    const dateLabel = requestType === 'DELIVERY' ? 'teslimat' : 'montaj'
    await prisma.proposalActivity.create({
      data: {
        proposalId: proposal.id,
        type: 'DATE_CHANGE_REQUESTED',
        description: `Müşteri ${dateLabel} tarihi değişikliği talep etti: ${currentDate.toISOString().slice(0, 10)} -> ${dateKey}`,
        metadata: {
          dateChangeRequestId: dateChangeRequest.id,
          requestType,
          currentDate: currentDate.toISOString(),
          requestedDate: parsedDate.toISOString(),
          customerNote: customerNote || null,
        },
      },
    })

    logger.info(`Date change request created: ${dateChangeRequest.id} for proposal ${proposal.id}`)

    return NextResponse.json({
      success: true,
      data: {
        id: dateChangeRequest.id,
        requestType: dateChangeRequest.requestType,
        currentDate: dateChangeRequest.currentDate,
        requestedDate: dateChangeRequest.requestedDate,
        status: dateChangeRequest.status,
      },
    })
  } catch (error) {
    logger.error('Date change request error', error)
    return NextResponse.json(
      { success: false, error: { message: 'Bir hata oluştu' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/proposals/date-change?token=xxx
 * Public endpoint - returns all date change requests for the proposal
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: 'Token gerekli' } },
        { status: 400 }
      )
    }

    const proposal = await prisma.proposal.findFirst({
      where: { publicToken: token, deletedAt: null },
      select: { id: true },
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: { message: 'Teklif bulunamadı' } },
        { status: 404 }
      )
    }

    const requests = await prisma.dateChangeRequest.findMany({
      where: { proposalId: proposal.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        requestType: true,
        currentDate: true,
        requestedDate: true,
        status: true,
        counterDate: true,
        customerNote: true,
        ownerNote: true,
        createdAt: true,
        respondedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: requests,
    })
  } catch (error) {
    logger.error('Date change requests fetch error', error)
    return NextResponse.json(
      { success: false, error: { message: 'Bir hata oluştu' } },
      { status: 500 }
    )
  }
}
