import { z } from 'zod'

export const adminInventoryFiltersSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export const adminStockAdjustmentSchema = z.strictObject({
  direction: z.enum(['decrease', 'increase']),
  quantity: z.number().int().positive().max(2_147_483_647),
  reason: z.string().trim().min(3).max(500),
})

export const adminInventoryProductRowSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().trim().min(1),
  stock_quantity: z.coerce.number().int().nonnegative(),
})

export const adminInventoryMovementRowsSchema = z.array(z.strictObject({
  actor: z.strictObject({
    full_name: z.string().trim().min(1),
  }).nullable(),
  created_at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  movement_type: z.enum([
    'initial_stock',
    'manual_adjustment',
    'order_cancelled',
    'order_created',
  ]),
  order: z.strictObject({
    order_number: z.string().trim().min(1),
  }).nullable(),
  quantity_delta: z.coerce.number().int(),
  reason: z.string().nullable(),
  stock_after: z.coerce.number().int().nonnegative(),
  stock_before: z.coerce.number().int().nonnegative(),
}))
