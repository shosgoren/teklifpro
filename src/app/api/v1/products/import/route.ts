import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ProductImportAPI');

const PRODUCT_TYPE_MAP: Record<string, string> = {
  'COMMERCIAL': 'COMMERCIAL',
  'RAW_MATERIAL': 'RAW_MATERIAL',
  'SEMI_FINISHED': 'SEMI_FINISHED',
  'CONSUMABLE': 'CONSUMABLE',
  'Ticari': 'COMMERCIAL',
  'Hammadde': 'RAW_MATERIAL',
  'Yarı Mamül': 'SEMI_FINISHED',
  'Sarf': 'CONSUMABLE',
};

interface ImportRow {
  code: string;
  name: string;
  category?: string;
  productType?: string;
  unit?: string;
  listPrice?: number;
  costPrice?: number;
  laborCost?: number;
  overheadRate?: number;
  vatRate?: number;
  description?: string;
}

/**
 * POST /api/v1/products/import
 * Import products from Excel (.xlsx) or CSV
 */
async function handlePost(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File must be under 10MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];

    if (!ws) {
      return NextResponse.json(
        { success: false, error: 'Empty spreadsheet' },
        { status: 400 }
      );
    }

    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

    if (rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data rows found' },
        { status: 400 }
      );
    }

    if (rawRows.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Maximum 1000 rows allowed per import' },
        { status: 400 }
      );
    }

    // Map column names (support both Turkish and English headers)
    const rows: ImportRow[] = rawRows.map((raw) => ({
      code: String(raw['Ürün Kodu'] ?? raw['code'] ?? raw['Code'] ?? '').trim(),
      name: String(raw['Ürün Adı'] ?? raw['name'] ?? raw['Name'] ?? '').trim(),
      category: String(raw['Kategori'] ?? raw['category'] ?? raw['Category'] ?? '').trim() || undefined,
      productType: String(raw['Tür'] ?? raw['productType'] ?? raw['Type'] ?? 'COMMERCIAL').trim(),
      unit: String(raw['Birim'] ?? raw['unit'] ?? raw['Unit'] ?? 'Adet').trim(),
      listPrice: parseFloat(raw['Liste Fiyatı'] ?? raw['listPrice'] ?? raw['List Price'] ?? 0) || 0,
      costPrice: parseFloat(raw['Maliyet Fiyatı'] ?? raw['costPrice'] ?? raw['Cost Price'] ?? 0) || 0,
      laborCost: parseFloat(raw['İşçilik'] ?? raw['laborCost'] ?? raw['Labor Cost'] ?? 0) || 0,
      overheadRate: parseFloat(raw['Genel Gider %'] ?? raw['overheadRate'] ?? raw['Overhead %'] ?? 0) || 0,
      vatRate: parseFloat(raw['KDV %'] ?? raw['vatRate'] ?? raw['VAT %'] ?? 18) || 18,
      description: String(raw['Açıklama'] ?? raw['description'] ?? raw['Description'] ?? '').trim() || undefined,
    }));

    // Validate required fields
    const errors: string[] = [];
    rows.forEach((row, i) => {
      if (!row.name) errors.push(`Satır ${i + 2}: Ürün adı zorunlu`);
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Validation errors', details: errors.slice(0, 20) },
        { status: 400 }
      );
    }

    // Get existing product codes for this tenant to detect duplicates
    const existingProducts = await prisma.product.findMany({
      where: { tenantId: session.tenant.id, deletedAt: null },
      select: { code: true },
    });
    const existingCodes = new Set(existingProducts.map((p) => p.code).filter(Boolean));

    let created = 0;
    let skipped = 0;
    const skippedCodes: string[] = [];

    // Create products in batches
    for (const row of rows) {
      if (row.code && existingCodes.has(row.code)) {
        skipped++;
        skippedCodes.push(row.code);
        continue;
      }

      const productType = (PRODUCT_TYPE_MAP[row.productType || ''] || 'COMMERCIAL') as 'COMMERCIAL' | 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'CONSUMABLE';

      await prisma.product.create({
        data: {
          tenantId: session.tenant.id,
          code: row.code || null,
          name: row.name,
          category: row.category || null,
          productType,
          unit: row.unit || 'Adet',
          listPrice: row.listPrice || 0,
          costPrice: row.costPrice || 0,
          laborCost: row.laborCost || 0,
          overheadRate: row.overheadRate || 0,
          vatRate: row.vatRate || 18,
          description: row.description || null,
        },
      });

      if (row.code) existingCodes.add(row.code);
      created++;
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
        skipped,
        total: rows.length,
        skippedCodes: skippedCodes.slice(0, 20),
      },
    });
  } catch (error) {
    logger.error('POST /api/v1/products/import error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost, ['product.create']);
