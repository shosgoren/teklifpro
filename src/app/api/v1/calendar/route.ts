import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('CalendarAPI')

/**
 * GET /api/v1/calendar
 * Returns busy dates for the tenant — dates where delivery or installation capacity is full
 * Used by date pickers to disable fully-booked days (doctor appointment style)
 *
 * Query params:
 *   from: ISO date (default: today)
 *   to: ISO date (default: 6 months from now)
 *   excludeProposalId: exclude this proposal from count (for editing)
 */
async function handleGet(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!
    const tenantId = session.tenant.id

    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date()
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date(Date.now() + 180 * 86400000)
    const excludeProposalId = searchParams.get('excludeProposalId') || undefined

    // Get tenant capacity settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { dailyDeliveryCapacity: true, dailyInstallationCapacity: true },
    })

    const deliveryCapacity = tenant?.dailyDeliveryCapacity ?? 1
    const installationCapacity = tenant?.dailyInstallationCapacity ?? 1

    // Get all proposals with delivery/installation dates in the range
    const proposals = await prisma.proposal.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
        ...(excludeProposalId ? { id: { not: excludeProposalId } } : {}),
        OR: [
          { deliveryDate: { gte: from, lte: to } },
          { installationDate: { gte: from, lte: to } },
        ],
      },
      select: {
        id: true,
        deliveryDate: true,
        installationDate: true,
        deliveryCompleted: true,
        installationCompleted: true,
        customer: { select: { name: true } },
        proposalNumber: true,
      },
    })

    // Count deliveries and installations per day
    const deliveryCounts: Record<string, number> = {}
    const installationCounts: Record<string, number> = {}
    const dayEvents: Record<string, Array<{ type: string; proposalNumber: string; customerName: string }>> = {}

    for (const p of proposals) {
      if (p.deliveryDate) {
        const key = p.deliveryDate.toISOString().slice(0, 10)
        deliveryCounts[key] = (deliveryCounts[key] || 0) + 1
        if (!dayEvents[key]) dayEvents[key] = []
        dayEvents[key].push({
          type: 'delivery',
          proposalNumber: p.proposalNumber,
          customerName: p.customer?.name || '',
        })
      }
      if (p.installationDate) {
        const key = p.installationDate.toISOString().slice(0, 10)
        installationCounts[key] = (installationCounts[key] || 0) + 1
        if (!dayEvents[key]) dayEvents[key] = []
        dayEvents[key].push({
          type: 'installation',
          proposalNumber: p.proposalNumber,
          customerName: p.customer?.name || '',
        })
      }
    }

    // Find fully booked days
    const disabledDeliveryDates: string[] = []
    const disabledInstallationDates: string[] = []

    for (const [date, count] of Object.entries(deliveryCounts)) {
      if (count >= deliveryCapacity) disabledDeliveryDates.push(date)
    }
    for (const [date, count] of Object.entries(installationCounts)) {
      if (count >= installationCapacity) disabledInstallationDates.push(date)
    }

    return NextResponse.json({
      success: true,
      data: {
        disabledDeliveryDates,
        disabledInstallationDates,
        deliveryCapacity,
        installationCapacity,
        events: dayEvents,
      },
    })
  } catch (error) {
    logger.error('Calendar API error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withAuth(handleGet, ['proposal.read'])
