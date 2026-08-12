import { z } from 'zod'

const optionalHttpsUrlSchema = z.preprocess(
  (value) => value === '' ? null : value,
  z.url('Ingresá una URL válida').refine(
    (value) => value.startsWith('https://'),
    'La URL debe comenzar con https://',
  ).nullable(),
)

const normalizedPhoneSchema = z.string().trim().transform(
  (value) => value.replace(/\D/g, ''),
).pipe(z.string().regex(/^[1-9][0-9]{7,14}$/))

const normalizedCbuSchema = z.string().trim().transform(
  (value) => value.replace(/\D/g, ''),
).pipe(z.string().regex(/^[0-9]{22}$/))

export const adminSettingsUpdateSchema = z.strictObject({
  address: z.string().trim().min(2).max(300),
  bankName: z.string().trim().min(2).max(120),
  businessHours: z.string().trim().min(2).max(1_000),
  businessName: z.string().trim().min(2).max(120),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  facebook: optionalHttpsUrlSchema,
  instagram: optionalHttpsUrlSchema,
  lowStockThreshold: z.number().int().min(0).max(1_000_000),
  mapsUrl: z.url('Ingresá una URL válida').refine(
    (value) => value.startsWith('https://'),
    'La URL debe comenzar con https://',
  ),
  tiktok: optionalHttpsUrlSchema,
  transferAlias: z.string().trim().min(2).max(120),
  transferCbu: normalizedCbuSchema,
  transferDiscount: z.number().min(0).max(100),
  whatsapp: normalizedPhoneSchema,
})

export const adminSettingsImageMutationSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
})

const adminSettingsRowFields = {
  address: z.string().trim().min(1),
  bank_name: z.string().trim().min(1),
  business_hours: z.string().trim().min(1),
  business_name: z.string().trim().min(1),
  facebook: z.url().nullable(),
  id: z.uuid(),
  instagram: z.url().nullable(),
  logo_path: z.string().trim().min(1).nullable(),
  low_stock_threshold: z.coerce.number().int().nonnegative(),
  maps_url: z.url().refine((value) => value.startsWith('https://')),
  tiktok: z.url().nullable(),
  transfer_alias: z.string().trim().min(1),
  transfer_cbu: z.string().regex(/^[0-9]{22}$/),
  transfer_discount: z.coerce.number().min(0).max(100),
  updated_at: z.iso.datetime({ offset: true }),
  whatsapp: z.string().regex(/^[1-9][0-9]{7,14}$/),
}

export const adminSettingsRowSchema = z.strictObject(adminSettingsRowFields)
