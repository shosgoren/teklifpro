/**
 * GET  /api/v1/purchases — List purchase bills
 * POST /api/v1/purchases — Create purchase bill
 */
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/shared/utils/prisma'
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware'
import { createPurchaseSchema } from '@/shared/validations'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('PurchasesAPI')

async function handleGet(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')

    const where: Prisma.PurchaseBillWhereInput = {
      tenantId: session.tenant.id,
      deletedAt: null,
    }

    if (status) where.status = status as Prisma.EnumPurchaseBillStatusFilter
    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [bills, total] = await Promise.all([
      prisma.purchaseBill.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseBill.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: bills,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    logger.error('GET /api/v1/purchases error:', error)
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
    const validation = createPurchaseSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz veriler', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { items, ...billData } = validation.data

    // Calculate totals
    let subtotal = 0
    let vatTotal = 0
    const processedItems = items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice
      const lineVat = lineTotal * (item.vatRate / 100)
      subtotal += lineTotal
      vatTotal += lineVat
      return {
        ...item,
        lineTotal,
      }
    })

    const bill = await prisma.purchaseBill.create({
      data: {
        tenantId: session.tenant.id,
        supplierId: billData.supplierId,
        billNumber: billData.billNumber,
        description: billData.description,
        issueDate: new Date(billData.issueDate),
        dueDate: billData.dueDate ? new Date(billData.dueDate) : null,
        currency: billData.currency,
        subtotal,
        vatTotal,
        grandTotal: subtotal + vatTotal,
        createdBy: session.user.id,
        items: {
          create: processedItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: {
        items: true,
        supplier: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: bill }, { status: 201 })
  } catch (error) {
    logger.error('POST /api/v1/purchases error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handleGet, ['purchase.read'])
export const POST = withAuth(handlePost, ['purchase.create'])
