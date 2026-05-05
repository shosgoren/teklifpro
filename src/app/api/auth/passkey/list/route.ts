import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/shared/auth/authOptions'
import { prisma } from '@/shared/utils/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const items = await prisma.authenticator.findMany({
    where: { userId: session.user.id as string },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      deviceType: true,
      backedUp: true,
      transports: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return NextResponse.json({ authenticators: items })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })
  }

  const auth = await prisma.authenticator.findFirst({
    where: { id, userId: session.user.id as string },
  })
  if (!auth) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  await prisma.authenticator.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
