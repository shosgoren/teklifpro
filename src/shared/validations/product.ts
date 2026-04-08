import { z } from 'zod'

export const createProductSchema = z.object({
  code: z.string().min(1, 'Urun kodu gerekli').max(50),
  name: z.string().min(1, 'Urun adi gerekli').max(255),
  category: z.string().max(100).optional(),
  unit: z.string().min(1, 'Birim gerekli').max(50),
  listPrice: z.number().nonnegative('Liste fiyati negatif olamaz'),
  vatRate: z.number().min(0).max(100).default(18),
  isActive: z.boolean().default(true),
  description: z.string().optional().default(''),
  productType: z.enum(['COMMERCIAL', 'RAW_MATERIAL', 'SEMI_FINISHED', 'CONSUMABLE']).optional().default('COMMERCIAL'),
  costPrice: z.number().nonnegative().optional(),
  laborCost: z.number().nonnegative().optional(),
  overheadRate: z.number().min(0).max(100).optional(),
  minStockLevel: z.number().nonnegative().optional(),
})

export const productQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional().default(''),
  category: z.string().optional().default(''),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  productType: z.enum(['COMMERCIAL', 'RAW_MATERIAL', 'SEMI_FINISHED', 'CONSUMABLE', '']).optional().default(''),
  stockStatus: z.enum(['all', 'low', 'inStock', 'outOfStock']).optional().default('all'),
  sortBy: z.enum(['createdAt', 'name', 'listPrice', 'stockQuantity']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const bulkPriceSchema = z.object({
  percentage: z.number().min(-99).max(1000),
  field: z.enum(['listPrice', 'costPrice']).default('listPrice'),
  category: z.string().optional(),
  productType: z.enum(['COMMERCIAL', 'RAW_MATERIAL', 'SEMI_FINISHED', 'CONSUMABLE']).optional(),
  productIds: z.array(z.string().min(1)).optional(),
})

export const linkSupplierSchema = z.object({
  supplierId: z.string().min(1, 'Tedarikci ID gerekli'),
  unitPrice: z.number().nonnegative('Birim fiyat negatif olamaz'),
  currency: z.string().max(10).default('TRY'),
  leadTimeDays: z.number().int().nonnegative().nullable().optional(),
  minOrderQty: z.number().nonnegative().nullable().optional(),
  isPreferred: z.boolean().default(false),
  notes: z.string().max(2000).nullable().optional(),
})

export const unlinkSupplierSchema = z.object({
  supplierId: z.string().min(1, 'Tedarikci ID gerekli'),
})

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().optional(),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type ProductQueryInput = z.infer<typeof productQuerySchema>
export type BulkPriceInput = z.infer<typeof bulkPriceSchema>
export type LinkSupplierInput = z.infer<typeof linkSupplierSchema>
export type UnlinkSupplierInput = z.infer<typeof unlinkSupplierSchema>
