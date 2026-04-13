import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('DateChangeAPI')

/**
 * GET /api/v1/proposals/[id]/date-change
 * Returns all DateChangeRequest records for the proposal, sorted by createdAt desc.
 */
async function handleGet(request: NextRequest, context?: { params: Record<string, string> }) {
  try {
    const session = getSessionFromRequest(request)!
    const tenantId = session.tenant.id
    const proposalId = context!.params.id

    // Verify proposal belongs to tenant
    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, tenantId, deletedAt: null },
      select: { id: true },
    })

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const dateChangeRequests = await prisma.dateChangeRequest.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: dateChangeRequests,
    })
  } catch (error) {
    logger.error('Failed to fetch date change requests', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/v1/proposals/[id]/date-change
 * Approves, rejects, or counter-offers a date change request.
 */
async function handlePut(request: NextRequest, context?: { params: Record<string, string> }) {
  try {
    const session = getSessionFromRequest(request)!
    const tenantId = session.tenant.id
    const proposalId = context!.params.id

    const body = await request.json()
    const { requestId, action, counterDate, ownerNote } = body as {
      requestId: string
      action: 'APPROVE' | 'REJECT' | 'COUNTER'
      counterDate?: string
      ownerNote?: string
    }

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 })
    }

    if (!['APPROVE', 'REJECT', 'COUNTER'].includes(action)) {
      return NextResponse.json({ error: 'action must be APPROVE, REJECT, or COUNTER' }, { status: 400 })
    }

    if (action === 'COUNTER' && !counterDate) {
      return NextResponse.json({ error: 'counterDate is required for COUNTER action' }, { status: 400 })
    }

    // Verify proposal belongs to tenant
    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, tenantId, deletedAt: null },
      select: { id: true, tenantId: true },
    })

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Find the date change request and verify it belongs to this proposal and is PENDING
    const dateChangeRequest = await prisma.dateChangeRequest.findFirst({
      where: { id: requestId, proposalId, status: 'PENDING' },
    })

    if (!dateChangeRequest) {
      return NextResponse.json(
        { error: 'Date change request not found or is no longer pending' },
        { status: 404 }
      )
    }

    const now = new Date()

    if (action === 'APPROVE') {
      const result = await prisma.$transaction(async (tx) => {
        // Update the DateChangeRequest status
        const updatedRequest = await tx.dateChangeRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            respondedAt: now,
            ownerNote: ownerNote || undefined,
          },
        })

        // Update the proposal date based on requestType
        const dateField = dateChangeRequest.requestType === 'DELIVERY'
          ? 'deliveryDate'
          : 'installationDate'

        await tx.proposal.update({
          where: { id: proposalId },
          data: { [dateField]: dateChangeRequest.requestedDate },
        })

        // Create activity
        await tx.proposalActivity.create({
          data: {
            proposalId,
            type: 'DATE_CHANGE_APPROVED',
            description: `Date change request approved: ${dateChangeRequest.requestType.toLowerCase()} date changed to ${dateChangeRequest.requestedDate.toISOString().slice(0, 10)}`,
            metadata: {
              requestId,
              requestType: dateChangeRequest.requestType,
              previousDate: dateChangeRequest.currentDate.toISOString(),
              newDate: dateChangeRequest.requestedDate.toISOString(),
            },
          },
        })

        return updatedRequest
      })

      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'REJECT') {
      const result = await prisma.$transaction(async (tx) => {
        const updatedRequest = await tx.dateChangeRequest.update({
          where: { id: requestId },
          data: {
            status: 'REJECTED',
            respondedAt: now,
            ownerNote: ownerNote || undefined,
          },
        })

        await tx.proposalActivity.create({
          data: {
            proposalId,
            type: 'DATE_CHANGE_REJECTED',
            description: `Date change request rejected for ${dateChangeRequest.requestType.toLowerCase()} date`,
            metadata: {
              requestId,
              requestType: dateChangeRequest.requestType,
              requestedDate: dateChangeRequest.requestedDate.toISOString(),
              ownerNote: ownerNote || null,
            },
          },
        })

        return updatedRequest
      })

      return NextResponse.json({ success: true, data: result })
    }

    // action === 'COUNTER'
    const parsedCounterDate = new Date(counterDate!)

    if (isNaN(parsedCounterDate.getTime())) {
      return NextResponse.json({ error: 'Invalid counterDate format' }, { status: 400 })
    }

    // Check capacity for counter date (same logic as calendar API)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { dailyDeliveryCapacity: true, dailyInstallationCapacity: true },
    })

    const isDelivery = dateChangeRequest.requestType === 'DELIVERY'
    const capacity = isDelivery
      ? (tenant?.dailyDeliveryCapacity ?? 1)
      : (tenant?.dailyInstallationCapacity ?? 1)

    const dayStart = new Date(parsedCounterDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(parsedCounterDate)
    dayEnd.setHours(23, 59, 59, 999)

    const dateField = isDelivery ? 'deliveryDate' : 'installationDate'

    const bookedCount = await prisma.proposal.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
        id: { not: proposalId },
        [dateField]: { gte: dayStart, lte: dayEnd },
      },
    })

    if (bookedCount >= capacity) {
      return NextResponse.json(
        { error: `The counter date is fully booked (${bookedCount}/${capacity} ${isDelivery ? 'deliveries' : 'installations'})` },
        { status: 409 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.dateChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'COUNTER_OFFERED',
          counterDate: parsedCounterDate,
          respondedAt: now,
          ownerNote: ownerNote || undefined,
        },
      })

      await tx.proposalActivity.create({
        data: {
          proposalId,
          type: 'DATE_CHANGE_COUNTER',
          description: `Counter offer made for ${dateChangeRequest.requestType.toLowerCase()} date: ${parsedCounterDate.toISOString().slice(0, 10)}`,
          metadata: {
            requestId,
            requestType: dateChangeRequest.requestType,
            originalRequestedDate: dateChangeRequest.requestedDate.toISOString(),
            counterDate: parsedCounterDate.toISOString(),
            ownerNote: ownerNote || null,
          },
        },
      })

      return updatedRequest
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    logger.error('Failed to process date change request', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withAuth(handleGet, ['proposal.read'])
export const PUT = withAuth(handlePut, ['proposal.update'])
