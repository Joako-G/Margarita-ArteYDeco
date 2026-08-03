import { z } from 'zod'

export const settingsRowSchema = z.object({
  address: z.string().trim().min(1),
  business_hours: z.string().trim().min(1),
  business_name: z.string().trim().min(1),
  facebook: z.url().nullable(),
  id: z.uuid(),
  instagram: z.url().nullable(),
  logo_path: z.string().min(1).nullable(),
  maps_url: z.url().refine((value) => value.startsWith('https://')),
  transfer_discount: z.coerce.number().min(0).max(100),
  whatsapp: z.string().regex(/^[1-9][0-9]{7,14}$/),
})
