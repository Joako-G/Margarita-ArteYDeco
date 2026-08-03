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

export type AdminLoginInput = z.infer<typeof adminLoginSchema>
