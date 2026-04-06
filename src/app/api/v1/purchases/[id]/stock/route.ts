/**
 * POST /api/v1/purchases/[id]/stock — Process stock entries from purchase bill
 * Creates stock movements for each line item with a linked product
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('PurchaseStockAPI')

async function handlePost(
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
        items: {
          where: { productId: { not: null } },
          include: {
            product: { select: { id: true, trackStock: true, stockQuantity: true } },
          },
        },
      },
    })

    if (!bill) {
      return NextResponse.json({ success: false, error: 'Purchase bill not found' }, { status: 404 })
    }

    if (bill.stockProcessed) {
      return NextResponse.json(
        { success: false, error: 'Bu faturanın stok girişi zaten yapılmış' },
        { status: 400 }
      )
    }

    // Process stock entries in a transaction
    const stockableItems = bill.items.filter(
      (item) => item.product && item.product.trackStock
    )

    if (stockableItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stok takibi yapılan ürün bulunamadı' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      for (const item of stockableItems) {
        if (!item.productId || !item.product) continue

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            tenantId: session.tenant.id,
            productId: item.productId,
            type: 'PURCHASE',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            reference: bill.billNumber || `PB-${bill.id.slice(-8)}`,
            notes: `Alış faturası: ${bill.description || bill.billNumber || bill.id}`,
            createdBy: session.user.id,
          },
        })

        // Update product stock quantity
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: Number(item.quantity),
            },
            costPrice: Number(item.unitPrice), // Update cost price to latest purchase price
          },
        })
      }

      // Mark bill as stock processed
      await tx.purchaseBill.update({
        where: { id: billId },
        data: { stockProcessed: true },
      })
    })

    logger.info(`Stock processed for purchase bill ${billId}`, {
      itemCount: stockableItems.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        billId,
        processedItems: stockableItems.length,
        message: `${stockableItems.length} ürün için stok girişi yapıldı`,
      },
    })
  } catch (error) {
    logger.error('POST /api/v1/purchases/[id]/stock error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost, ['purchase.update', 'stock.create'])
