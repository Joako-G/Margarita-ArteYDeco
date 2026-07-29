import { z } from 'zod'

import { normalizePhone } from '../utils/checkout-links.ts'

const NAME_PATTERN = /^[\p{L}\s'-]+$/u

export const checkoutSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'Ingresá tu nombre.')
    .max(50, 'El nombre puede tener hasta 50 caracteres.')
    .regex(NAME_PATTERN, 'El nombre solo puede incluir letras, espacios, apóstrofes o guiones.'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Ingresá tu apellido.')
    .max(50, 'El apellido puede tener hasta 50 caracteres.')
    .regex(NAME_PATTERN, 'El apellido solo puede incluir letras, espacios, apóstrofes o guiones.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Ingresá un celular para que podamos contactarte.')
    .refine((value) => {
      const normalizedPhone = normalizePhone(value)

      return normalizedPhone.length >= 10 && normalizedPhone.length <= 15
    }, 'Ingresá un celular válido, incluyendo el código de área.'),
  notes: z.string().trim().max(500, 'Las observaciones pueden tener hasta 500 caracteres.'),
  paymentMethod: z.enum(['cash', 'transfer']),
})
