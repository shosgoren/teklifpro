import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/shared/lib/auth';
import { createBomSchema } from '@/shared/validations/bom';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('BomAPI');

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId') || '';

    const where: any = {
      tenantId: session.user.tenantId,
      isActive: true,
    };

    if (productId) {
      where.productId = productId;
    }

    const boms = await prisma.billOfMaterial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
    });

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
    });
  } catch (error) {
    logger.error('GET /api/v1/bom error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = createBomSchema.parse(body);

    // Verify product belongs to tenant
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        tenantId: session.user.tenantId,
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
        tenantId: session.user.tenantId,
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
        tenantId: session.user.tenantId,
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
          tenantId: session.user.tenantId,
          isActive: true,
        },
        data: { isActive: false },
      });

      // Create new BOM with items
      return tx.billOfMaterial.create({
        data: {
          tenantId: session.user.tenantId,
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
