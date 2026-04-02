import { z } from 'zod'

// Voice note security constants
export const VOICE_NOTE_MAX_DURATION = 60

export const CreateProposalSchema = z.object({
  customerId: z.string(),
  contactId: z.string().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      unit: z.string().default('Adet'),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      discountRate: z.number().min(0).max(100).default(0),
      vatRate: z.number().min(0).max(100).default(18),
    })
  ),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  voiceNoteData: z.string().nullable().optional(),
  voiceNoteDuration: z.number().min(0).max(VOICE_NOTE_MAX_DURATION).nullable().optional(),
})

export const UpdateProposalSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'EXPIRED']).optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    productId: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    unit: z.string().default('Adet'),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    discountRate: z.number().min(0).max(100).default(0),
    vatRate: z.number().min(0).max(100).default(18),
  })).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  customerId: z.string().optional(),
})

export const SendProposalSchema = z.object({
  method: z.enum(['whatsapp', 'email', 'sms']).default('whatsapp'),
  message: z.string().optional(),
})

export const CloneProposalBodySchema = z.object({
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
  priceMultiplier: z.number().positive().optional(),
  includeNotes: z.boolean().default(true),
})

export const BulkSendSchema = z.object({
  proposalIds: z.array(z.string().min(1), {
    errorMap: () => ({ message: 'En az bir teklif ID\'si gerekli' }),
  }).min(1, 'En az bir teklif ID\'si gerekli'),
  channel: z.enum(['whatsapp', 'email', 'both']).default('whatsapp'),
  scheduledAt: z.string().datetime().optional(),
  message: z.string().max(1000).optional(),
})

export const GetProposalsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'REVISED', 'EXPIRED', 'CANCELLED']).optional(),
})

export type CreateProposalInput = z.infer<typeof CreateProposalSchema>
export type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>
export type SendProposalInput = z.infer<typeof SendProposalSchema>
export type CloneProposalInput = z.infer<typeof CloneProposalBodySchema>
export type BulkSendInput = z.infer<typeof BulkSendSchema>
export type GetProposalsInput = z.infer<typeof GetProposalsSchema>
