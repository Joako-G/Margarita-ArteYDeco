import { z } from 'zod'

export const adminLoginSchema = z.object({
  email: z.email('Ingresá un correo electrónico válido')
    .trim()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Ingresá tu contraseña').max(1_024),
})

export const adminProfileRowSchema = z.object({
  email: z.email(),
  full_name: z.string().min(1),
  id: z.uuid(),
  is_active: z.boolean(),
  role: z.literal('administrator'),
})

export const adminProfileDetailRowSchema = adminProfileRowSchema.extend({
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
})

export const adminProfileNameUpdateSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  fullName: z.string().trim().min(2).max(120),
})

export const adminProfileEmailUpdateSchema = z.strictObject({
  currentPassword: z.string().min(1).max(1_024),
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
})

export const adminProfilePasswordUpdateSchema = z.strictObject({
  currentPassword: z.string().min(1).max(1_024),
  newPassword: z.string().min(12).max(128),
})

export type AdminLoginInput = z.infer<typeof adminLoginSchema>
