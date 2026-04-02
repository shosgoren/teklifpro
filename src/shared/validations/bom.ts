import { z } from 'zod'

export const bomItemSchema = z.object({
  materialId: z.string().min(1, 'Malzeme ID gerekli'),
  quantity: z.number().positive('Miktar pozitif olmali'),
  unit: z.string().min(1).default('Adet'),
  wasteRate: z.number().min(0).max(100).default(0),
  notes: z.string().optional().default(''),
  sortOrder: z.number().int().min(0).optional().default(0),
})

export const createBomSchema = z.object({
  productId: z.string().min(1, 'Urun ID gerekli'),
  notes: z.string().optional().default(''),
  items: z.array(bomItemSchema).min(1, 'En az bir malzeme gerekli'),
})

export const updateBomSchema = z.object({
  notes: z.string().optional(),
  items: z.array(bomItemSchema).min(1, 'En az bir malzeme gerekli'),
})

export type BomItemInput = z.infer<typeof bomItemSchema>
export type CreateBomInput = z.infer<typeof createBomSchema>
export type UpdateBomInput = z.infer<typeof updateBomSchema>
