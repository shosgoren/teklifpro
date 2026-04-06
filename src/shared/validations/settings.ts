import { z } from 'zod'

export const FollowupSettingsSchema = z.object({
  smartFollowupEnabled: z.boolean(),
  followupDaysAfterView: z.number().int().min(1).max(30).default(3),
  followupMessage: z.string().max(1000).nullable().optional(),
  followupMaxReminders: z.number().int().min(1).max(5).default(2),
})

export const widgetConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  size: z.enum(['small', 'medium', 'large']),
  position: z.number().int().min(0),
  visible: z.boolean(),
})

export const saveDashboardSchema = z.object({
  widgets: z.array(widgetConfigSchema).max(20),
})

export type FollowupSettingsInput = z.infer<typeof FollowupSettingsSchema>
export type WidgetConfigInput = z.infer<typeof widgetConfigSchema>
export type SaveDashboardInput = z.infer<typeof saveDashboardSchema>
