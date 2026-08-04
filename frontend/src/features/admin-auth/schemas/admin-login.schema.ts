import { z } from 'zod'

export const adminLoginSchema = z.object({
  email: z.email('Ingresá un correo electrónico válido')
    .trim()
    .max(254, 'El correo electrónico es demasiado largo'),
  password: z.string()
    .min(1, 'Ingresá tu contraseña')
    .max(1_024, 'La contraseña es demasiado larga'),
})

export type AdminLoginFormValues = z.infer<typeof adminLoginSchema>
