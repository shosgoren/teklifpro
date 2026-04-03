import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { VoiceEditSchema } from '@/shared/validations/voice-proposal'
import { Logger } from '@/infrastructure/logger'
import voiceProposalParser from '@/infrastructure/services/voice/VoiceProposalParser'
import { VoiceEditResponse, VoiceParseResult } from '@/infrastructure/services/voice/types'

const logger = new Logger('VoiceEditAPI')

async function handlePost(request: NextRequest): Promise<NextResponse<VoiceEditResponse>> {
  try {
    const session = getSessionFromRequest(request)!

    const body = await request.json()
    const payload = VoiceEditSchema.parse(body)

    const result = await voiceProposalParser.edit(
      payload.currentProposal as VoiceParseResult,
      payload.editCommand,
      session.tenant.id
    )

    logger.info(`Voice edit completed for tenant ${session.tenant.id}, changes: ${result.changes.length}`)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('POST /api/v1/proposals/voice-edit error:', error)

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
