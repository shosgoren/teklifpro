import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
})

export const searchableQuerySchema = paginationSchema.extend({
  search: z.string().optional().default(''),
})
