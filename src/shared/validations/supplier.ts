import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Tedarikci adi gerekli').max(255),
  contactName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Gecerli bir e-posta adresi girin').max(255).optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  taxNumber: z.string().max(50).optional(),
  taxOffice: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contactName: z.string().max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  taxNumber: z.string().max(50).nullable().optional(),
  taxOffice: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
})

export const supplierQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional().default(''),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>
