import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Firma adi gerekli').max(255),
  shortName: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('Gecerli e-posta adresi girin').optional(),
  city: z.string().max(100).optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const customerQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional().default(''),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
})

export const createNoteSchema = z.object({
  content: z.string().min(1, 'Not icerigi bos olamaz').max(5000),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>
export type CreateNoteInput = z.infer<typeof createNoteSchema>
