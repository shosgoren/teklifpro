import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { createBomSchema } from '@/shared/validations/bom';
import { Prisma } from '@prisma/client';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('BomAPI');

async function handleGet(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.BillOfMaterialWhereInput = {
      tenantId: session.tenant.id,
      isActive: true,
    };

    if (productId) {
      where.productId = productId;
    }

    const [boms, total] = await Promise.all([
      prisma.billOfMaterial.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
              category: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.billOfMaterial.count({ where }),
    ]);

    const formattedBoms = boms.map((bom) => ({
      id: bom.id,
      productId: bom.productId,
      product: bom.product,
      version: bom.version,
      isActive: bom.isActive,
      notes: bom.notes,
      itemCount: bom._count.items,
      createdAt: bom.createdAt.toISOString(),
      updatedAt: bom.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedBoms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('GET /api/v1/bom error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const body = await request.json();
    const data = createBomSchema.parse(body);

    // Verify product belongs to tenant
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        tenantId: session.tenant.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Urun bulunamadi' },
        { status: 404 }
      );
    }

    // Verify all materials belong to tenant
    const materialIds = data.items.map((item) => item.materialId);
    const materials = await prisma.product.findMany({
      where: {
        id: { in: materialIds },
        tenantId: session.tenant.id,
      },
    });

    if (materials.length !== materialIds.length) {
      return NextResponse.json(
        { success: false, error: 'Bir veya daha fazla malzeme bulunamadi' },
        { status: 404 }
      );
    }

    // Determine next version
    const latestBom = await prisma.billOfMaterial.findFirst({
      where: {
        productId: data.productId,
        tenantId: session.tenant.id,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = latestBom ? latestBom.version + 1 : 1;

    // Create BOM in a transaction: deactivate old versions + create new
    const bom = await prisma.$transaction(async (tx) => {
      // Deactivate previous active versions
      await tx.billOfMaterial.updateMany({
        where: {
          productId: data.productId,
          tenantId: session.tenant.id,
          isActive: true,
        },
        data: { isActive: false },
      });

      // Create new BOM with items
      return tx.billOfMaterial.create({
        data: {
          tenantId: session.tenant.id,
          productId: data.productId,
          version: nextVersion,
          isActive: true,
          notes: data.notes || null,
          items: {
            create: data.items.map((item, index) => ({
              materialId: item.materialId,
              quantity: item.quantity,
              unit: item.unit,
              wasteRate: item.wasteRate,
              notes: item.notes || null,
              sortOrder: item.sortOrder ?? index,
            })),
          },
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
          items: {
            include: {
              material: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  unit: true,
                  listPrice: true,
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    const formattedBom = {
      id: bom.id,
      productId: bom.productId,
      product: bom.product,
      version: bom.version,
      isActive: bom.isActive,
      notes: bom.notes,
      items: bom.items.map((item) => ({
        id: item.id,
        materialId: item.materialId,
        material: {
          ...item.material,
          listPrice: item.material.listPrice?.toNumber?.() || 0,
        },
        quantity: Number(item.quantity),
        unit: item.unit,
        wasteRate: Number(item.wasteRate),
        notes: item.notes,
        sortOrder: item.sortOrder,
      })),
      createdAt: bom.createdAt.toISOString(),
      updatedAt: bom.updatedAt.toISOString(),
    };

    return NextResponse.json(
      { success: true, data: formattedBom },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/v1/bom error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['bom.read']);
export const POST = withAuth(handlePost, ['bom.create']);
