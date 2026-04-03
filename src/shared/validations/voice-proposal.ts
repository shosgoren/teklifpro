import { z } from 'zod'

export const VoiceTranscribeSchema = z.object({
  audioData: z.string().min(1, 'Audio data required').refine(
    (val) => val.startsWith('data:audio/'),
    'Must be a data:audio/* URL'
  ),
  language: z.string().default('tr'),
})

export const VoiceParseSchema = z.object({
  transcript: z.string().min(1, 'Transcript required').max(5000),
  language: z.string().default('tr'),
})

export const VoiceEditSchema = z.object({
  currentProposal: z.object({
    customer: z.object({
      query: z.string(),
      matchedId: z.string().nullable(),
      matchedName: z.string().nullable(),
      confidence: z.number(),
      isNewCustomer: z.boolean(),
    }),
    items: z.array(z.object({
      name: z.string(),
      matchedProductId: z.string().nullable(),
      matchedProductName: z.string().nullable(),
      quantity: z.number(),
      unitPrice: z.number().nullable(),
      unit: z.string(),
      vatRate: z.number(),
      confidence: z.number(),
    })),
    discountRate: z.number(),
    paymentTerms: z.string().nullable(),
    deliveryTerms: z.string().nullable(),
    notes: z.string().nullable(),
    overallConfidence: z.number(),
    rawTranscript: z.string(),
  }),
  editCommand: z.string().min(1).max(2000),
})

export type VoiceTranscribeInput = z.infer<typeof VoiceTranscribeSchema>
export type VoiceParseInput = z.infer<typeof VoiceParseSchema>
export type VoiceEditInput = z.infer<typeof VoiceEditSchema>
