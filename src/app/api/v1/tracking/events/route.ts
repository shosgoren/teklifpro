import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/shared/auth/authOptions'
import { prisma } from '@/shared/utils/prisma'

/**
 * GET /api/v1/tracking/events
 *
 * Tüm açık tekliflerin teslim ve kurulum tarihlerini ayrı event satırları olarak döner.
 * Takvim, kanban ve harita görünümleri tek API'den beslenir.
 *
 * Query:
 *   from?: ISO date (default: -3 ay)
 *   to?:   ISO date (default: +6 ay)
 *
 * Returns:
 *   { events: [{
 *     id, type: 'delivery'|'installation', date,
 *     proposal: { id, number, title, status, type: 'OFFICIAL'|'UNOFFICIAL' },
 *     customer: { id, name, address, phone, lat?, lng? }
 *   }] }
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const url = new URL(req.url)
  const from = url.searchParams.get('from')
    ? new Date(url.searchParams.get('from')!)
    : new Date(Date.now() - 90 * 86400000)
  const to = url.searchParams.get('to')
    ? new Date(url.searchParams.get('to')!)
    : new Date(Date.now() + 180 * 86400000)

  const proposals = await prisma.proposal.findMany({
    where: {
      tenantId: session.user.tenantId as string,
      deletedAt: null,
      status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
      OR: [
        { deliveryDate: { gte: from, lte: to } },
        { installationDate: { gte: from, lte: to } },
      ],
    },
    select: {
      id: true,
      proposalNumber: true,
      title: true,
      status: true,
      proposalType: true,
      deliveryDate: true,
      installationDate: true,
      deliveryCompleted: true,
      installationCompleted: true,
      customer: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
        },
      },
    },
    orderBy: [{ deliveryDate: 'asc' }, { installationDate: 'asc' }],
    take: 500,
  })

  const events: Array<{
    id: string
    type: 'delivery' | 'installation'
    date: string
    completed: boolean
    proposal: {
      id: string
      number: string
      title: string | null
      status: string
      proposalType: string
    }
    customer: {
      id: string
      name: string
      address: string | null
      phone: string | null
    } | null
  }> = []

  for (const p of proposals) {
    if (p.deliveryDate) {
      events.push({
        id: `${p.id}-delivery`,
        type: 'delivery',
        date: p.deliveryDate.toISOString(),
        completed: p.deliveryCompleted,
        proposal: {
          id: p.id,
          number: p.proposalNumber,
          title: p.title,
          status: p.status,
          proposalType: p.proposalType,
        },
        customer: p.customer
          ? {
              id: p.customer.id,
              name: p.customer.name,
              address: p.customer.address,
              phone: p.customer.phone,
            }
          : null,
      })
    }
    if (p.installationDate) {
      events.push({
        id: `${p.id}-installation`,
        type: 'installation',
        date: p.installationDate.toISOString(),
        completed: p.installationCompleted,
        proposal: {
          id: p.id,
          number: p.proposalNumber,
          title: p.title,
          status: p.status,
          proposalType: p.proposalType,
        },
        customer: p.customer
          ? {
              id: p.customer.id,
              name: p.customer.name,
              address: p.customer.address,
              phone: p.customer.phone,
            }
          : null,
      })
    }
  }

  // Sort flat by date
  events.sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ events })
}
