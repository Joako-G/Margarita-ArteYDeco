import { z } from 'zod'

const orderStatusSchema = z.enum([
  'cancelled',
  'paid',
  'payment_pending',
  'pending',
  'picked_up',
  'preparing',
  'ready',
])
const paymentMethodSchema = z.enum(['bank_transfer', 'cash'])
const paymentStatusSchema = z.enum(['paid', 'pending', 'rejected'])

export const adminOrderFiltersSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  paymentMethod: z.enum(['all', 'bank_transfer', 'cash']).default('all'),
  paymentStatus: z.enum(['all', 'paid', 'pending', 'rejected']).default('all'),
  search: z.string().trim().min(2).max(80).optional(),
  sort: z.enum(['newest', 'oldest', 'totalAsc', 'totalDesc']).default('newest'),
  status: z.enum([
    'all',
    'cancelled',
    'paid',
    'payment_pending',
    'pending',
    'picked_up',
    'preparing',
    'ready',
  ]).default('all'),
})

const adminOrderRowFields = {
  created_at: z.iso.datetime({ offset: true }),
  customer_first_name: z.string().trim().min(1),
  customer_last_name: z.string().trim().min(1),
  customer_phone: z.string().trim().min(1),
  customer_phone_normalized: z.string().regex(/^[1-9][0-9]{7,14}$/),
  delivery_method: z.enum(['pickup', 'shipping']),
  discount: z.coerce.number().nonnegative(),
  id: z.uuid(),
  notes: z.string().nullable(),
  order_number: z.string().trim().min(1),
  payment_method: paymentMethodSchema,
  payment_status: paymentStatusSchema,
  picked_up_at: z.iso.datetime({ offset: true }).nullable(),
  shipping_address: z.string().nullable(),
  status: orderStatusSchema,
  subtotal: z.coerce.number().nonnegative(),
  total: z.coerce.number().positive(),
  updated_at: z.iso.datetime({ offset: true }),
}

export const adminOrderRowsSchema = z.array(z.strictObject({
  ...adminOrderRowFields,
  order_items: z.array(z.strictObject({ count: z.coerce.number().int().nonnegative() })),
}))

export const adminOrderRowSchema = z.strictObject(adminOrderRowFields)

export const adminOrderItemRowsSchema = z.array(z.strictObject({
  product_name: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
  subtotal: z.coerce.number().positive(),
  unit_price: z.coerce.number().positive(),
}))

export const adminOrderIdParamsSchema = z.strictObject({ orderId: z.uuid() })

export const adminOrderActionSchema = z.strictObject({
  action: z.enum(['confirmPayment', 'markPickedUp', 'markReady', 'startPreparing']),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
})

export const adminOrderCancellationSchema = z.strictObject({
  confirmManualRefund: z.boolean().default(false),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  reason: z.string().trim().min(3).max(500),
})
