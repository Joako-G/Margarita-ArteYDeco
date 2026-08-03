import { z } from 'zod'

export const adminDashboardSettingsRowSchema = z.strictObject({
  low_stock_threshold: z.coerce.number().int().nonnegative(),
})

export const adminDashboardLowStockRowsSchema = z.array(z.strictObject({
  id: z.uuid(),
  name: z.string().trim().min(1),
  stock_quantity: z.coerce.number().int().nonnegative(),
}))

export const adminDashboardRecentOrderRowsSchema = z.array(z.strictObject({
  created_at: z.iso.datetime({ offset: true }),
  customer_first_name: z.string().trim().min(1),
  customer_last_name: z.string().trim().min(1),
  order_number: z.string().regex(/^MAD-[0-9]{8}-[0-9]{6,}$/),
  payment_method: z.enum(['bank_transfer', 'cash']),
  status: z.enum([
    'cancelled',
    'paid',
    'payment_pending',
    'pending',
    'picked_up',
    'preparing',
    'ready',
  ]),
  total: z.coerce.number().positive(),
}))
