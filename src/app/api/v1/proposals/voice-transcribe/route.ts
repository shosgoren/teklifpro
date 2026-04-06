import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { VoiceTranscribeSchema } from '@/shared/validations/voice-proposal'
import { Logger } from '@/infrastructure/logger'
import voiceTranscriptionService from '@/infrastructure/services/voice/VoiceTranscriptionService'
import { VoiceTranscribeResponse, VOICE_PROPOSAL_LIMITS } from '@/infrastructure/services/voice/types'

const logger = new Logger('VoiceTranscribeAPI')

// In-memory usage tracking: Map<"tenantId:YYYY-MM-DD", count>
const dailyUsageMap = new Map<string, number>()

// Periodic cleanup to prevent memory leak — remove old date keys
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const today = new Date().toISOString().slice(0, 10)
    for (const key of dailyUsageMap.keys()) {
      if (!key.endsWith(today)) dailyUsageMap.delete(key)
    }
  }, 60 * 60 * 1000) // every hour
}

function getDailyUsageKey(tenantId: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `${tenantId}:${today}`
}

function getDailyUsage(tenantId: string): number {
  return dailyUsageMap.get(getDailyUsageKey(tenantId)) || 0
}

function incrementDailyUsage(tenantId: string): void {
  const key = getDailyUsageKey(tenantId)
  dailyUsageMap.set(key, (dailyUsageMap.get(key) || 0) + 1)
}

function getDailyLimit(plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'): number {
  return VOICE_PROPOSAL_LIMITS[plan] ?? VOICE_PROPOSAL_LIMITS.STARTER
}

async function handlePost(request: NextRequest): Promise<NextResponse<VoiceTranscribeResponse>> {
  try {
    const session = getSessionFromRequest(request)!

    const body = await request.json()
    const payload = VoiceTranscribeSchema.parse(body)

    // Check daily usage limit
    const currentUsage = getDailyUsage(session.tenant.id)
    const limit = getDailyLimit(session.tenant.plan)

    if (currentUsage >= limit) {
      logger.warn(`Voice transcribe rate limit reached for tenant ${session.tenant.id}: ${currentUsage}/${limit}`)
      return NextResponse.json(
        {
          success: false,
          error: `Gunluk sesli teklif limitine ulastiniz (${limit}). Plan yukseltmek icin ayarlara gidin.`,
        },
        { status: 429 }
      )
    }

    const result = await voiceTranscriptionService.transcribe(
      payload.audioData,
      payload.language
    )

    incrementDailyUsage(session.tenant.id)

    logger.info(`Voice transcription completed for tenant ${session.tenant.id}, duration: ${result.duration}ms`)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('POST /api/v1/proposals/voice-transcribe error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error: ' + error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost, ['proposal.create'])
