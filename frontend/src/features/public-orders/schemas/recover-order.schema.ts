import { z } from 'zod'

import { normalizePhone } from '../../checkout/utils/checkout-links.ts'

import { normalizeOrderNumber } from '../utils/last-order.ts'

export const recoverOrderSchema = z.object({
  orderNumber: z
    .string()
    .transform(normalizeOrderNumber)
    .refine(
      (value) => /^MAD-[0-9]{8}-[0-9]{6,}$/.test(value),
      'Ingresá un número con el formato MAD-AAAAMMDD-000001.',
    ),
  phone: z
    .string()
    .trim()
    .min(1, 'Ingresá el celular utilizado en la compra.')
    .regex(/^\d+$/, 'El celular solo puede incluir números.')
    .refine((value) => {
      const normalizedPhone = normalizePhone(value)

      return normalizedPhone.length >= 8 && normalizedPhone.length <= 15
    }, 'Ingresá un celular válido, incluyendo el código de área.'),
})

export type RecoverOrderFormValuesType = z.input<typeof recoverOrderSchema>
