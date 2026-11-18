import { z } from 'zod'

import { normalizePhone } from './orders.schema.js'

const paymentCustomerSchema = z.strictObject({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(500).optional().default(''),
  phone: z.string().trim().min(8).max(30).refine(
    (value) => /^[1-9][0-9]{7,14}$/.test(normalizePhone(value)),
    'El celular no es válido',
  ),
})

export const paymentCheckoutBodySchema = z.strictObject({
  customer: paymentCustomerSchema,
  deliveryMethod: z.enum(['pickup', 'shipping']),
  items: z.array(z.strictObject({
    productId: z.uuid(),
    quantity: z.number().int().min(1).max(10_000),
  })).min(1).max(100),
  paymentMethod: z.literal('mercado_pago'),
  shippingAddress: z.string().trim().max(500).optional().default(''),
}).superRefine((value, context) => {
  if (value.deliveryMethod === 'shipping' && value.shippingAddress.length === 0) {
    context.addIssue({
      code: 'custom',
      message: 'La dirección de envío es obligatoria',
      path: ['shippingAddress'],
    })
  }
})
