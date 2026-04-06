import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, StockMovementType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { stockMovementQuerySchema, createMovementSchema } from '@/shared/validations/stock';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('StockMovementsAPI');

const querySchema = stockMovementQuerySchema;

async function handleGet(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const searchParams = request.nextUrl.searchParams;
    const queryData = querySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      productId: searchParams.get('productId') || '',
      type: searchParams.get('type') || '',
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
    });

    const page = Math.max(1, parseInt(queryData.page));
    const limit = Math.min(100, Math.max(1, parseInt(queryData.limit)));
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
      tenantId: session.tenant.id,
    };

    if (queryData.productId) {
      where.productId = queryData.productId;
    }

    if (queryData.type) {
      where.type = queryData.type as StockMovementType;
    }

    if (queryData.from || queryData.to) {
      where.createdAt = {};
      if (queryData.from) {
        where.createdAt.gte = new Date(queryData.from);
      }
      if (queryData.to) {
        where.createdAt.lte = new Date(queryData.to + 'T23:59:59.999Z');
      }
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
            },
          },
        },
      }),
    ]);

    const formattedMovements = movements.map((m) => ({
      id: m.id,
      productId: m.productId,
      productCode: m.product.code,
      productName: m.product.name,
      productUnit: m.product.unit,
      type: m.type,
      quantity: Number(m.quantity),
      unitPrice: m.unitPrice ? Number(m.unitPrice) : null,
      reference: m.reference,
      notes: m.notes,
      createdBy: m.createdBy,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        movements: formattedMovements,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('GET /api/v1/stock/movements error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const body = await request.json();
    const data = createMovementSchema.parse(body);

    // Verify the product belongs to this tenant and has stock tracking enabled
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        tenantId: session.tenant.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Urun bulunamadi', code: 'PRODUCT_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!product.trackStock) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bu urun icin stok takibi aktif degil',
          code: 'STOCK_TRACKING_DISABLED',
        },
        { status: 400 }
      );
    }

    // For OUT/PRODUCTION_OUT, check if there is sufficient stock
    if (
      (data.type === 'OUT' || data.type === 'PRODUCTION_OUT') &&
      Number(product.stockQuantity) < data.quantity
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Yetersiz stok. Mevcut: ${Number(product.stockQuantity)}, Talep: ${data.quantity}`,
          code: 'INSUFFICIENT_STOCK',
        },
        { status: 400 }
      );
    }

    // Calculate the new stock quantity
    let newStockQuantity: number;
    const currentStock = Number(product.stockQuantity);

    switch (data.type) {
      case 'IN':
      case 'PRODUCTION_IN':
        newStockQuantity = currentStock + data.quantity;
        break;
      case 'OUT':
      case 'PRODUCTION_OUT':
        newStockQuantity = currentStock - data.quantity;
        break;
      case 'ADJUSTMENT':
        newStockQuantity = data.quantity;
        break;
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          tenantId: session.tenant.id,
          productId: data.productId,
          type: data.type,
          quantity: new Decimal(data.quantity),
          unitPrice: data.unitPrice !== undefined ? new Decimal(data.unitPrice) : null,
          reference: data.reference || null,
          notes: data.notes || null,
          createdBy: session.user.id,
        },
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
            },
          },
        },
      });

      await tx.product.update({
        where: { id: data.productId },
        data: { stockQuantity: new Decimal(newStockQuantity) },
      });

      return movement;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          productId: result.productId,
          productCode: result.product.code,
          productName: result.product.name,
          productUnit: result.product.unit,
          type: result.type,
          quantity: Number(result.quantity),
          unitPrice: result.unitPrice ? Number(result.unitPrice) : null,
          reference: result.reference,
          notes: result.notes,
          createdBy: result.createdBy,
          createdAt: result.createdAt.toISOString(),
          newStockQuantity,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/v1/stock/movements error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['stock.read']);
export const POST = withAuth(handlePost, ['stock.create']);
