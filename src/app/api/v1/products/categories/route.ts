/**
 * GET  /api/v1/products/categories — List product categories
 * POST /api/v1/products/categories — Create or sync categories from Parasut
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { createCategorySchema } from '@/shared/validations'
import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('ProductCategoriesAPI')

async function handleGet(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!

    const categories = await prisma.productCategory.findMany({
      where: { tenantId: session.tenant.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true } },
        children: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          take: 100,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    logger.error('GET /api/v1/products/categories error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handlePost(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!
    const body = await request.json()

    // Check if this is a sync request
    if (body.action === 'sync') {
      try {
        const client = await ParasutClient.forTenant(session.tenant.id)
        const result = await client.syncProductCategories()
        return NextResponse.json({
          success: true,
          data: {
            synced: result.synced,
            errors: result.errors,
            message: `${result.synced} kategori senkronize edildi`,
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sync error'
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

    // Regular create
    const validation = createCategorySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz veriler', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const category = await prisma.productCategory.create({
      data: {
        tenantId: session.tenant.id,
        ...validation.data,
      },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    logger.error('POST /api/v1/products/categories error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handleGet, ['product.read'])
export const POST = withAuth(handlePost, ['product.create'])
