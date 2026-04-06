import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('BomCostAPI');

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
            laborCost: true,
            overheadRate: true,
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

    if (!bom) {
      return NextResponse.json(
        { success: false, error: 'Recete bulunamadi' },
        { status: 404 }
      );
    }

    // Calculate material costs
    const materialBreakdown = bom.items.map((item) => {
      const unitPrice = item.material.listPrice?.toNumber?.() || 0;
      const quantity = Number(item.quantity);
      const wasteRate = Number(item.wasteRate);
      const effectiveQuantity = quantity * (1 + wasteRate / 100);
      const totalCost = unitPrice * effectiveQuantity;

      return {
        materialId: item.materialId,
        materialCode: item.material.code,
        materialName: item.material.name,
        unit: item.unit,
        quantity,
        wasteRate,
        effectiveQuantity: Math.round(effectiveQuantity * 10000) / 10000,
        unitPrice,
        totalCost: Math.round(totalCost * 100) / 100,
      };
    });

    const totalMaterialCost = materialBreakdown.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );

    const laborCost = bom.product.laborCost?.toNumber?.() || 0;
    const overheadRate = bom.product.overheadRate?.toNumber?.() || 0;
    const overheadCost = Math.round(totalMaterialCost * (overheadRate / 100) * 100) / 100;
    const totalProductionCost = Math.round((totalMaterialCost + laborCost + overheadCost) * 100) / 100;

    return NextResponse.json({
      success: true,
      data: {
        bomId: bom.id,
        product: {
          id: bom.product.id,
          code: bom.product.code,
          name: bom.product.name,
        },
        version: bom.version,
        materialBreakdown,
        summary: {
          totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
          laborCost,
          overheadRate,
          overheadCost,
          totalProductionCost,
        },
      },
    });
  } catch (error) {
    logger.error('GET /api/v1/bom/[id]/cost error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['bom.read']);
