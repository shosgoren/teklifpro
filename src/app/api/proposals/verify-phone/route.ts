import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/shared/utils/prisma'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('ProposalVerifyPhoneAPI')

// In-memory rate limit (per IP)
// Note: Resets on serverless cold start. For persistent rate limiting,
// configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
const attempts = new Map<string, { count: number; blockedUntil: number }>()
const MAX_ATTEMPTS = 5
const BLOCK_DURATION = 15 * 60 * 1000 // 15 minutes

// Periodic cleanup to prevent memory leak
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now()
    for (const [key, val] of attempts) {
      if (val.blockedUntil < now && val.count === 0) attempts.delete(key)
    }
  }
  setInterval(cleanup, 5 * 60 * 1000) // every 5 minutes
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    // Rate limit check
    const entry = attempts.get(ip)
    if (entry && entry.blockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((entry.blockedUntil - Date.now()) / 60000)
      return NextResponse.json(
        { success: false, error: `Çok fazla yanlış deneme. ${minutesLeft} dakika sonra tekrar deneyin.` },
        { status: 429 }
      )
    }

    const { token, lastFourDigits } = await request.json()

    if (!token || !lastFourDigits) {
      return NextResponse.json(
        { success: false, error: 'Token ve son 4 hane gerekli' },
        { status: 400 }
      )
    }

    if (!/^\d{4}$/.test(lastFourDigits)) {
      return NextResponse.json(
        { success: false, error: 'Son 4 hane sadece rakam olmalı' },
        { status: 400 }
      )
    }

    const proposal = await prisma.proposal.findFirst({
      where: { publicToken: token, deletedAt: null },
      select: { id: true, customer: { select: { phone: true } } },
    })

    if (!proposal || !proposal.customer.phone) {
      return NextResponse.json(
        { success: false, error: 'Teklif bulunamadı' },
        { status: 404 }
      )
    }

    // Extract last 4 digits from customer phone
    const phoneDigits = proposal.customer.phone.replace(/\D/g, '')
    const actualLast4 = phoneDigits.slice(-4)

    if (lastFourDigits !== actualLast4) {
      // Increment attempts
      const current = attempts.get(ip) || { count: 0, blockedUntil: 0 }
      current.count++
      if (current.count >= MAX_ATTEMPTS) {
        current.blockedUntil = Date.now() + BLOCK_DURATION
        current.count = 0
      }
      attempts.set(ip, current)

      return NextResponse.json(
        { success: false, error: 'Telefon numarası eşleşmedi' },
        { status: 400 }
      )
    }

    // Success — clear attempts and create a signed verification token
    attempts.delete(ip)

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      throw new Error('NEXTAUTH_SECRET environment variable is not set')
    }
    const expiry = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    const payload = `${token}:${expiry}`
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    const verificationToken = `${payload}:${hmac}`

    const response = NextResponse.json({ success: true })
    response.cookies.set(`pv_${token.substring(0, 8)}`, verificationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: `/proposal/${token}`,
    })

    return response
  } catch (error) {
    logger.error('Phone verification error', error)
    return NextResponse.json(
      { success: false, error: 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}
