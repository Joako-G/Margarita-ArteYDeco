import { z } from 'zod'

const MAX_IMAGE_BYTES = 5 * 1_024 * 1_024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function isOptionalHttpsUrl(value: string): boolean {
  return value.trim() === '' || isHttpsUrl(value)
}

export function normalizeSettingsDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export const adminSettingsFormSchema = z.object({
  address: z.string().trim().min(2, 'Ingresá la dirección del local').max(300),
  bankName: z.string().trim().min(2, 'Ingresá el nombre del banco').max(120),
  businessHours: z.string().trim().min(2, 'Ingresá los horarios de atención').max(1_000),
  businessName: z.string().trim().min(2, 'Ingresá el nombre del negocio').max(120),
  facebook: z.string().trim().max(500).refine(
    isOptionalHttpsUrl,
    'Pegá un enlace completo que comience con https://',
  ),
  instagram: z.string().trim().max(500).refine(
    isOptionalHttpsUrl,
    'Pegá un enlace completo que comience con https://',
  ),
  lowStockThreshold: z.string().trim().regex(/^\d+$/, 'Ingresá un número entero mayor o igual a 0')
    .refine((value) => Number(value) <= 1_000_000, 'La cantidad elegida es demasiado alta'),
  mapsUrl: z.string().trim().refine(
    isHttpsUrl,
    'Pegá un enlace completo que comience con https://',
  ),
  tiktok: z.string().trim().max(500).refine(
    isOptionalHttpsUrl,
    'Pegá un enlace completo que comience con https://',
  ),
  transferAlias: z.string().trim().min(2, 'Ingresá el alias').max(120),
  transferCbu: z.string().trim().refine(
    (value) => /^\d{22}$/.test(normalizeSettingsDigits(value)),
    'El CBU debe tener 22 dígitos',
  ),
  transferDiscount: z.string().trim().refine(
    (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100,
    'Ingresá un porcentaje entre 0 y 100',
  ),
  whatsapp: z.string().trim().refine(
    (value) => /^[1-9][0-9]{7,14}$/.test(normalizeSettingsDigits(value)),
    'Ingresá un celular válido con código de país y área',
  ),
})

export type AdminSettingsFormType = z.infer<typeof adminSettingsFormSchema>

export const adminSettingsLogoSchema = z.object({
  logo: z.instanceof(File, { message: 'Seleccioná un archivo' })
    .refine((file) => file.size <= MAX_IMAGE_BYTES, 'El logo no puede superar los 5 MB')
    .refine((file) => IMAGE_TYPES.includes(file.type), 'El logo debe ser JPG, PNG o WebP'),
})

export type AdminSettingsLogoFormType = z.infer<typeof adminSettingsLogoSchema>
