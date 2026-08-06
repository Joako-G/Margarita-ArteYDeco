import { z } from 'zod'

const customerSchema = z.strictObject({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(500).optional().default(''),
  phone: z.string().trim().min(8).max(30).refine(
    (value) => /^[1-9][0-9]{7,14}$/.test(normalizePhone(value)),
    'El celular no es válido',
  ),
})

const itemSchema = z.strictObject({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(10_000),
})

export const deliveryMethodSchema = z.enum(['pickup', 'shipping'])

export const createOrderBodySchema = z.strictObject({
  customer: customerSchema,
  deliveryMethod: deliveryMethodSchema,
  items: z.array(itemSchema).min(1).max(100),
  paymentMethod: z.enum(['cash', 'transfer']),
  shippingAddress: z.string().trim().max(500).optional().default(''),
})

export const idempotencyKeySchema = z.string().trim().min(16).max(128).regex(
  /^[A-Za-z0-9._:-]+$/,
)

export const publicOrderParamsSchema = z.strictObject({
  orderNumber: z.string().trim().toUpperCase().regex(/^MAD-[0-9]{8}-[0-9]{6,}$/),
})

export const recoverOrderBodySchema = z.strictObject({
  orderNumber: z.string().trim().toUpperCase().regex(/^MAD-[0-9]{8}-[0-9]{6,}$/),
  phone: z.string().trim().min(8).max(30).refine(
    (value) => /^[1-9][0-9]{7,14}$/.test(normalizePhone(value)),
    'El celular no es válido',
  ),
  turnstileToken: z.string().trim().min(1).max(2_048).optional(),
})

export const recoveredGuestSessionSchema = z.strictObject({
  expires_at: z.iso.datetime({ offset: true }),
  guest_session_id: z.uuid(),
})

export const recoveryLimitSchema = z.strictObject({
  captcha_required: z.boolean(),
  is_blocked: z.boolean(),
  retry_after_seconds: z.coerce.number().int().nonnegative(),
})

export const orderIdRowSchema = z.strictObject({ id: z.uuid() })

export const orderRecoveryCandidateSchema = z.strictObject({
  customer_phone_normalized: z.string().regex(/^[1-9][0-9]{7,14}$/),
  id: z.uuid(),
})

export const guestSessionOrderRowsSchema = z.array(z.strictObject({
  order_id: z.uuid(),
}))

export const createdOrderReferenceSchema = z.strictObject({
  order_id: z.uuid(),
  order_number: z.string().regex(/^MAD-[0-9]{8}-[0-9]{6,}$/),
})

export const orderRowSchema = z.strictObject({
  created_at: z.iso.datetime({ offset: true }),
  customer_first_name: z.string().min(1),
  customer_last_name: z.string().min(1),
  delivery_method: deliveryMethodSchema,
  discount: z.coerce.number().nonnegative(),
  order_number: z.string().regex(/^MAD-[0-9]{8}-[0-9]{6,}$/),
  payment_method: z.enum(['bank_transfer', 'cash']),
  shipping_address: z.string().nullable(),
  status: z.enum(['cancelled', 'paid', 'payment_pending', 'pending', 'picked_up', 'preparing', 'ready']),
  subtotal: z.coerce.number().positive(),
  total: z.coerce.number().positive(),
})

export const orderItemRowsSchema = z.array(z.strictObject({
  product_name: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  subtotal: z.coerce.number().positive(),
  unit_price: z.coerce.number().positive(),
}))

export const orderSettingsRowSchema = z.strictObject({
  address: z.string().trim().min(1),
  bank_name: z.string().trim().min(1),
  business_hours: z.string().trim().min(1),
  maps_url: z.url().refine((value) => value.startsWith('https://')),
  transfer_alias: z.string().trim().min(1),
  transfer_cbu: z.string().trim().min(1),
  transfer_discount: z.coerce.number().min(0).max(100),
  whatsapp: z.string().regex(/^[1-9][0-9]{7,14}$/),
})

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
