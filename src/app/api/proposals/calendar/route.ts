import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('PublicCalendarAPI')

/**
 * GET /api/proposals/calendar?token=xxx
 * Public endpoint — returns disabled dates for a proposal's tenant
 * Used by customer-facing date change request date picker
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })
    }

    const proposal = await prisma.proposal.findUnique({
      where: { publicToken: token },
      select: { id: true, tenantId: true },
    })

    if (!proposal) {
      return NextResponse.json({ error: 'Teklif bulunamadı' }, { status: 404 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: proposal.tenantId },
      select: { dailyDeliveryCapacity: true, dailyInstallationCapacity: true },
    })

    const deliveryCapacity = tenant?.dailyDeliveryCapacity ?? 1
    const installationCapacity = tenant?.dailyInstallationCapacity ?? 1

    const from = new Date()
    const to = new Date(Date.now() + 180 * 86400000)

    const proposals = await prisma.proposal.findMany({
      where: {
        tenantId: proposal.tenantId,
        deletedAt: null,
        id: { not: proposal.id },
        status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
        OR: [
          { deliveryDate: { gte: from, lte: to } },
          { installationDate: { gte: from, lte: to } },
        ],
      },
      select: { deliveryDate: true, installationDate: true },
    })

    const deliveryCounts: Record<string, number> = {}
    const installationCounts: Record<string, number> = {}

    for (const p of proposals) {
      if (p.deliveryDate) {
        const key = p.deliveryDate.toISOString().slice(0, 10)
        deliveryCounts[key] = (deliveryCounts[key] || 0) + 1
      }
      if (p.installationDate) {
        const key = p.installationDate.toISOString().slice(0, 10)
        installationCounts[key] = (installationCounts[key] || 0) + 1
      }
    }

    const disabledDeliveryDates = Object.entries(deliveryCounts)
      .filter(([, count]) => count >= deliveryCapacity)
      .map(([date]) => date)
    const disabledInstallationDates = Object.entries(installationCounts)
      .filter(([, count]) => count >= installationCapacity)
      .map(([date]) => date)

    return NextResponse.json({
      success: true,
      data: { disabledDeliveryDates, disabledInstallationDates },
    })
  } catch (error) {
    logger.error('Public calendar error', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
