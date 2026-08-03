import { z } from 'zod'

export const turnstileSiteverifyResponseSchema = z.object({
  action: z.string().optional(),
  'error-codes': z.array(z.string()).optional().default([]),
  hostname: z.string().optional(),
  success: z.boolean(),
})
