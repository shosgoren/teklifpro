import { z } from 'zod'

export const SyncRequestSchema = z.object({
  entities: z.array(
    z.enum(['customers', 'products', 'bank_accounts', 'all'])
  ).optional(),
})

export const parasutSchema = z.object({
  companyId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
})

export const testParasutSchema = z.object({
  companyId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
})

export const whatsappSchema = z.object({
  phoneId: z.string().min(1),
  accessToken: z.string().min(1),
})

export const shareProposalSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().max(5000).optional(),
})

export const efaturaSchema = z.object({
  type: z.enum(['e_invoice', 'e_archive']),
  scenario: z.enum(['basic', 'commercial']).optional().default('basic'),
  receiverAlias: z.string().optional(),
  note: z.string().optional(),
  vatWithholdingCode: z.string().optional(),
  vatExemptionReasonCode: z.string().optional(),
  vatExemptionReason: z.string().optional(),
})

export type SyncRequestInput = z.infer<typeof SyncRequestSchema>
export type ShareProposalInput = z.infer<typeof shareProposalSchema>
export type EFaturaInput = z.infer<typeof efaturaSchema>
export type ParasutInput = z.infer<typeof parasutSchema>
export type TestParasutInput = z.infer<typeof testParasutSchema>
export type WhatsappInput = z.infer<typeof whatsappSchema>
