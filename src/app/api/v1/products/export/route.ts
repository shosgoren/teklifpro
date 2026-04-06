import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ProductExportAPI');

/**
 * GET /api/v1/products/export
 * Export all products as Excel (.xlsx)
 */
async function handleGet(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const products = await prisma.product.findMany({
      where: { tenantId: session.tenant.id, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        code: true,
        name: true,
        category: true,
        productType: true,
        unit: true,
        listPrice: true,
        costPrice: true,
        laborCost: true,
        overheadRate: true,
        vatRate: true,
        trackStock: true,
        stockQuantity: true,
        minStockLevel: true,
        isActive: true,
        description: true,
      },
    });

    const rows = products.map((p) => ({
      'Ürün Kodu': p.code || '',
      'Ürün Adı': p.name,
      'Kategori': p.category || '',
      'Tür': p.productType,
      'Birim': p.unit,
      'Liste Fiyatı': Number(p.listPrice),
      'Maliyet Fiyatı': Number(p.costPrice),
      'İşçilik': Number(p.laborCost),
      'Genel Gider %': Number(p.overheadRate),
      'KDV %': Number(p.vatRate),
      'Stok Takibi': p.trackStock ? 'Evet' : 'Hayır',
      'Stok Miktarı': Number(p.stockQuantity),
      'Min. Stok': Number(p.minStockLevel),
      'Aktif': p.isActive ? 'Evet' : 'Hayır',
      'Açıklama': p.description || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Ürün Kodu
      { wch: 30 }, // Ürün Adı
      { wch: 15 }, // Kategori
      { wch: 15 }, // Tür
      { wch: 10 }, // Birim
      { wch: 15 }, // Liste Fiyatı
      { wch: 15 }, // Maliyet
      { wch: 12 }, // İşçilik
      { wch: 12 }, // Genel Gider
      { wch: 8 },  // KDV
      { wch: 12 }, // Stok Takibi
      { wch: 12 }, // Stok Miktarı
      { wch: 10 }, // Min Stok
      { wch: 8 },  // Aktif
      { wch: 30 }, // Açıklama
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="urunler-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    logger.error('GET /api/v1/products/export error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['product.read']);
