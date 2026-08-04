import { z } from 'zod'

export const adminProfileNameSchema = z.strictObject({
  fullName: z.string().trim().min(2, 'Ingresá al menos 2 caracteres').max(120),
})

export const adminProfileEmailSchema = z.strictObject({
  currentPassword: z.string().min(1, 'Ingresá tu contraseña actual').max(1_024),
  email: z.email('Ingresá un correo electrónico válido').max(254),
})

export const adminProfilePasswordSchema = z.strictObject({
  confirmPassword: z.string().min(1, 'Repetí la nueva contraseña').max(128),
  currentPassword: z.string().min(1, 'Ingresá tu contraseña actual').max(1_024),
  newPassword: z.string()
    .min(12, 'Usá al menos 12 caracteres')
    .max(128, 'Usá hasta 128 caracteres'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
}).refine((values) => values.newPassword !== values.currentPassword, {
  message: 'La nueva contraseña debe ser diferente',
  path: ['newPassword'],
})

export type AdminProfileNameFormType = z.infer<typeof adminProfileNameSchema>
export type AdminProfileEmailFormType = z.infer<typeof adminProfileEmailSchema>
export type AdminProfilePasswordFormType = z.infer<typeof adminProfilePasswordSchema>
