import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { z } from 'zod'
import { authOptions } from '@/shared/auth/authOptions'
import { detectDeviceName, getRpConfig } from '@/shared/auth/webauthn'
import { prisma } from '@/shared/utils/prisma'

const schema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  response: z.unknown(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const userId = session.user.id as string

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const response = parsed.data.response as RegistrationResponseJSON
  const { rpID, origin } = getRpConfig()

  const challenge = await prisma.webAuthnChallenge.findFirst({
    where: {
      userId,
      kind: 'REGISTRATION',
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (!challenge) {
    return NextResponse.json({ error: 'CHALLENGE_NOT_FOUND' }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'VERIFICATION_FAILED',
        message: err instanceof Error ? err.message : 'verify error',
      },
      { status: 400 },
    )
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'NOT_VERIFIED' }, { status: 400 })
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo

  const friendlyName =
    parsed.data.name?.trim() ||
    detectDeviceName(req.headers.get('user-agent'))

  const auth = await prisma.authenticator.create({
    data: {
      userId,
      name: friendlyName,
      credentialID: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    },
  })

  await prisma.webAuthnChallenge.delete({ where: { id: challenge.id } })

  return NextResponse.json({
    ok: true,
    authenticator: {
      id: auth.id,
      name: auth.name,
      createdAt: auth.createdAt,
    },
  })
}
