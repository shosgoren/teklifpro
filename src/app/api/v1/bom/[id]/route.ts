import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { updateBomSchema } from '@/shared/validations/bom';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('BomDetailAPI');

async function handleGet(request: NextRequest, context?: { params: Record<string, string> }) {
  try {
    const session = getSessionFromRequest(request)!;

    const id = context!.params.id;

    const bom = await prisma.billOfMaterial.findFirst({
      where: {
        id,
        tenantId: session.tenant.id,
      },
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
        items: {
          include: {
            material: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
                stockQuantity: true,
                listPrice: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!bom) {
      return NextResponse.json(
        { success: false, error: 'Recete bulunamadi' },
        { status: 404 }
      );
    }

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
          stockQuantity: Number(item.material.stockQuantity || 0),
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

    return NextResponse.json({
      success: true,
      data: formattedBom,
    });
  } catch (error) {
    logger.error('GET /api/v1/bom/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handlePut(request: NextRequest, context?: { params: Record<string, string> }) {
  try {
    const session = getSessionFromRequest(request)!;

    const id = context!.params.id;
    const body = await request.json();
    const data = updateBomSchema.parse(body);

    // Verify BOM belongs to tenant
    const existingBom = await prisma.billOfMaterial.findFirst({
      where: {
        id,
        tenantId: session.tenant.id,
      },
    });

    if (!existingBom) {
      return NextResponse.json(
        { success: false, error: 'Recete bulunamadi' },
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

    // Replace all items in a transaction
    const bom = await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.bomItem.deleteMany({
        where: { bomId: id },
      });

      // Update BOM and create new items
      return tx.billOfMaterial.update({
        where: { id },
        data: {
          notes: data.notes !== undefined ? data.notes : existingBom.notes,
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

    return NextResponse.json({
      success: true,
      data: formattedBom,
    });
  } catch (error) {
    logger.error('PUT /api/v1/bom/[id] error:', error);

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

async function handleDelete(request: NextRequest, context?: { params: Record<string, string> }) {
  try {
    const session = getSessionFromRequest(request)!;

    const id = context!.params.id;

    const existingBom = await prisma.billOfMaterial.findFirst({
      where: {
        id,
        tenantId: session.tenant.id,
      },
    });

    if (!existingBom) {
      return NextResponse.json(
        { success: false, error: 'Recete bulunamadi' },
        { status: 404 }
      );
    }

    // Soft delete: set isActive to false
    await prisma.billOfMaterial.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Recete basariyla silindi' },
    });
  } catch (error) {
    logger.error('DELETE /api/v1/bom/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['bom.read']);
export const PUT = withAuth(handlePut, ['bom.update']);
export const DELETE = withAuth(handleDelete, ['bom.delete']);
