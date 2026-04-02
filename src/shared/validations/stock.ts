import { z } from 'zod'

export const stockQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional().default(''),
  type: z.string().optional().default(''),
  lowStock: z.string().optional().default(''),
})

export const stockMovementQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  productId: z.string().optional().default(''),
  type: z.string().optional().default(''),
  from: z.string().optional().default(''),
  to: z.string().optional().default(''),
})

export const createMovementSchema = z.object({
  productId: z.string().min(1, 'Urun ID gerekli'),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'PRODUCTION_IN', 'PRODUCTION_OUT']),
  quantity: z.number().positive('Miktar pozitif olmali'),
  unitPrice: z.number().nonnegative('Birim fiyat negatif olamaz').optional(),
  reference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
})

export type StockQueryInput = z.infer<typeof stockQuerySchema>
export type StockMovementQueryInput = z.infer<typeof stockMovementQuerySchema>
export type CreateMovementInput = z.infer<typeof createMovementSchema>
