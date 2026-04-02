import { z } from 'zod'

export const FollowupSettingsSchema = z.object({
  smartFollowupEnabled: z.boolean(),
  followupDaysAfterView: z.number().int().min(1).max(30).default(3),
  followupMessage: z.string().max(1000).nullable().optional(),
  followupMaxReminders: z.number().int().min(1).max(5).default(2),
})

export type FollowupSettingsInput = z.infer<typeof FollowupSettingsSchema>
