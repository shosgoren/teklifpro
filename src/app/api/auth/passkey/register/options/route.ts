import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { authOptions } from '@/shared/auth/authOptions'
import { getRpConfig } from '@/shared/auth/webauthn'
import { prisma } from '@/shared/utils/prisma'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const userId = session.user.id as string
  const { rpID, rpName } = getRpConfig()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
  }

  const existing = await prisma.authenticator.findMany({
    where: { userId },
    select: { credentialID: true, transports: true },
  })

  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.name,
    timeout: 60000,
    attestationType: 'none',
    excludeCredentials: existing.map((a) => ({
      id: a.credentialID,
      transports: a.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  await prisma.webAuthnChallenge.create({
    data: {
      userId,
      challenge: options.challenge,
      kind: 'REGISTRATION',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  })

  return NextResponse.json(options)
}
