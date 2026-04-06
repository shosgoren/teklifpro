/**
 * POST /api/v1/purchases/sync — Sync purchase bills from Parasut
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('PurchaseSyncAPI')

async function handlePost(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!
    const client = await ParasutClient.forTenant(session.tenant.id)
    const result = await client.syncAllPurchaseBills()

    return NextResponse.json({
      success: true,
      data: {
        synced: result.synced,
        errors: result.errors,
        message: `${result.synced} alış faturası senkronize edildi`,
      },
    })
  } catch (error) {
    logger.error('POST /api/v1/purchases/sync error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'

    if (message === 'PARASUT_NOT_CONFIGURED') {
      return NextResponse.json(
        { success: false, error: 'Paraşüt yapılandırılmamış' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost, ['purchase.read', 'integration.sync'])
