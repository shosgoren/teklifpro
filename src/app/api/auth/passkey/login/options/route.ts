import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { z } from 'zod'
import { getRpConfig } from '@/shared/auth/webauthn'
import { prisma } from '@/shared/utils/prisma'

const schema = z.object({
  email: z.string().email().toLowerCase().trim().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const { rpID } = getRpConfig()

  let allowCredentials:
    | { id: string; transports?: AuthenticatorTransport[] }[]
    | undefined
  let userId: string | null = null

  if (parsed.data.email) {
    const user = await prisma.user.findFirst({
      where: { email: parsed.data.email, isActive: true, deletedAt: null },
      include: {
        authenticators: { select: { credentialID: true, transports: true } },
      },
    })
    if (user && user.authenticators.length > 0) {
      userId = user.id
      allowCredentials = user.authenticators.map((a) => ({
        id: a.credentialID,
        transports: a.transports as AuthenticatorTransport[],
      }))
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    timeout: 60000,
    userVerification: 'preferred',
    allowCredentials,
  })

  await prisma.webAuthnChallenge.create({
    data: {
      userId,
      email: parsed.data.email,
      challenge: options.challenge,
      kind: 'AUTHENTICATION',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  })

  return NextResponse.json(options)
}
