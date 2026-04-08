import { z } from 'zod'

export const suggestProductsSchema = z.object({
  action: z.literal('suggest-products'),
  customerId: z.string().min(1),
})

export const suggestPricingSchema = z.object({
  action: z.literal('suggest-pricing'),
  customerId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).optional(),
  })),
})

export const predictAcceptanceSchema = z.object({
  action: z.literal('predict-acceptance'),
  proposalData: z.object({
    customerId: z.string(),
    totalAmount: z.number(),
    itemCount: z.number(),
    averageDiscount: z.number(),
    currency: z.string().optional(),
  }),
})

export const suggestFollowUpSchema = z.object({
  action: z.literal('suggest-followup'),
  proposalId: z.string().min(1),
})

export const improveTextSchema = z.object({
  action: z.literal('improve-text'),
  text: z.string().min(10).max(5000),
  locale: z.enum(['tr', 'en']).optional().default('tr'),
})

export const generateNoteSchema = z.object({
  action: z.literal('generate-note'),
  customerName: z.string(),
  items: z.array(z.object({
    productName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
  })),
  locale: z.enum(['tr', 'en']).optional().default('tr'),
})

export const aiRequestSchema = z.discriminatedUnion('action', [
  suggestProductsSchema,
  suggestPricingSchema,
  predictAcceptanceSchema,
  suggestFollowUpSchema,
  improveTextSchema,
  generateNoteSchema,
])

export type SuggestProductsInput = z.infer<typeof suggestProductsSchema>
export type SuggestPricingInput = z.infer<typeof suggestPricingSchema>
export type PredictAcceptanceInput = z.infer<typeof predictAcceptanceSchema>
export type SuggestFollowUpInput = z.infer<typeof suggestFollowUpSchema>
export type ImproveTextInput = z.infer<typeof improveTextSchema>
export type GenerateNoteInput = z.infer<typeof generateNoteSchema>
export type AiRequestInput = z.infer<typeof aiRequestSchema>
