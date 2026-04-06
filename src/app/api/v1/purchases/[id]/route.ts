/**
 * GET    /api/v1/purchases/[id] — Get purchase bill detail
 * DELETE /api/v1/purchases/[id] — Soft delete purchase bill
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('PurchaseDetailAPI')

async function handleGet(
  request: NextRequest,
  context?: { params: Record<string, string> }
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!
    const billId = context?.params?.id

    if (!billId) {
      return NextResponse.json({ success: false, error: 'Bill ID required' }, { status: 400 })
    }

    const bill = await prisma.purchaseBill.findFirst({
      where: {
        id: billId,
        tenantId: session.tenant.id,
        deletedAt: null,
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, code: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    })

    if (!bill) {
      return NextResponse.json({ success: false, error: 'Purchase bill not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: bill })
  } catch (error) {
    logger.error('GET /api/v1/purchases/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

async function handleDelete(
  request: NextRequest,
  context?: { params: Record<string, string> }
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!
    const billId = context?.params?.id

    if (!billId) {
      return NextResponse.json({ success: false, error: 'Bill ID required' }, { status: 400 })
    }

    const bill = await prisma.purchaseBill.findFirst({
      where: {
        id: billId,
        tenantId: session.tenant.id,
        deletedAt: null,
      },
      select: { id: true, stockProcessed: true },
    })

    if (!bill) {
      return NextResponse.json({ success: false, error: 'Purchase bill not found' }, { status: 404 })
    }

    if (bill.stockProcessed) {
      return NextResponse.json(
        { success: false, error: 'Bu faturanın stok girişi yapılmış. Önce stok hareketlerini iptal edin.' },
        { status: 400 }
      )
    }

    await prisma.purchaseBill.update({
      where: { id: billId },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true, data: { message: 'Fatura silindi' } })
  } catch (error) {
    logger.error('DELETE /api/v1/purchases/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withAuth(handleGet, ['purchase.read'])
export const DELETE = withAuth(handleDelete, ['purchase.delete'])
