import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { VoiceParseSchema } from '@/shared/validations/voice-proposal'
import { Logger } from '@/infrastructure/logger'
import voiceProposalParser from '@/infrastructure/services/voice/VoiceProposalParser'
import { VoiceParseResponse } from '@/infrastructure/services/voice/types'

const logger = new Logger('VoiceParseAPI')

async function handlePost(request: NextRequest): Promise<NextResponse<VoiceParseResponse>> {
  try {
    const session = getSessionFromRequest(request)!

    const body = await request.json()
    const payload = VoiceParseSchema.parse(body)

    const result = await voiceProposalParser.parse(
      payload.transcript,
      session.tenant.id,
      payload.language
    )

    logger.info(`Voice parse completed for tenant ${session.tenant.id}, confidence: ${result.overallConfidence}`)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('POST /api/v1/proposals/voice-parse error:', error)

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
