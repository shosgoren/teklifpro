import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/shared/auth/authOptions'
import { prisma } from '@/shared/utils/prisma'

const querySchema = z.object({
  date: z.string().min(8),
  type: z.enum(['delivery', 'installation']),
  excludeId: z.string().optional(),
})

// Kabul edilmiş veya kabul yolundaki tekliflerle aynı güne çakışma → HARD BLOCK
const HARD_STATUSES = ['ACCEPTED', 'INVOICED'] as const
// Bunların dışındaki açık statüler → uyarı (geçilebilir)
const WARN_STATUSES = ['DRAFT', 'READY', 'SENT', 'VIEWED', 'REVISION_REQUESTED', 'REVISED'] as const

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    date: url.searchParams.get('date') ?? '',
    type: url.searchParams.get('type') ?? '',
    excludeId: url.searchParams.get('excludeId') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', details: parsed.error.flatten() }, { status: 400 })
  }

  const day = new Date(parsed.data.date)
  if (isNaN(day.getTime())) {
    return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 })
  }

  // Aynı gün başlangıç/bitiş
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0)
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)

  // İki tarih alanını da kontrol et — bir teklifin teslim tarihi başka birinin kurulum tarihiyle de çakışabilir
  const conflicts = await prisma.proposal.findMany({
    where: {
      tenantId: session.user.tenantId as string,
      deletedAt: null,
      id: parsed.data.excludeId ? { not: parsed.data.excludeId } : undefined,
      OR: [
        { deliveryDate: { gte: dayStart, lte: dayEnd } },
        { installationDate: { gte: dayStart, lte: dayEnd } },
      ],
    },
    select: {
      id: true,
      proposalNumber: true,
      title: true,
      status: true,
      deliveryDate: true,
      installationDate: true,
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const hard = conflicts.filter((p) => HARD_STATUSES.includes(p.status as typeof HARD_STATUSES[number]))
  const warn = conflicts.filter((p) => WARN_STATUSES.includes(p.status as typeof WARN_STATUSES[number]))

  return NextResponse.json({
    hasAcceptedConflict: hard.length > 0,
    conflicts: conflicts.map((p) => ({
      id: p.id,
      proposalNumber: p.proposalNumber,
      title: p.title,
      status: p.status,
      customer: p.customer?.name,
      deliveryMatches: p.deliveryDate
        ? p.deliveryDate >= dayStart && p.deliveryDate <= dayEnd
        : false,
      installationMatches: p.installationDate
        ? p.installationDate >= dayStart && p.installationDate <= dayEnd
        : false,
    })),
    hard: hard.length,
    warn: warn.length,
  })
}
