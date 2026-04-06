import { z } from 'zod'

export const createPurchaseSchema = z.object({
  supplierId: z.string().optional(),
  billNumber: z.string().optional(),
  description: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  currency: z.string().default('TRY'),
  items: z.array(z.object({
    productId: z.string().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    unit: z.string().default('Adet'),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    vatRate: z.number().min(0).max(100).default(20),
  })).min(1),
})

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>
