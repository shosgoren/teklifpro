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

export type SyncRequestInput = z.infer<typeof SyncRequestSchema>
export type ParasutInput = z.infer<typeof parasutSchema>
export type TestParasutInput = z.infer<typeof testParasutSchema>
export type WhatsappInput = z.infer<typeof whatsappSchema>
