import { z } from 'zod'

export const adminCustomerFiltersSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().min(2).max(80).optional(),
  sort: z.enum(['nameAsc', 'nameDesc', 'newest', 'oldest']).default('nameAsc'),
})

export const adminCustomerOrderFiltersSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export const adminCustomerIdParamsSchema = z.strictObject({ customerId: z.uuid() })

export const adminCustomerUpdateSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(1_000).nullable(),
  phone: z.string().trim().min(8).max(40),
})

export const adminCustomerSoftDeleteSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
})

const adminCustomerRowFields = {
  created_at: z.iso.datetime({ offset: true }),
  first_name: z.string().trim().min(1),
  id: z.uuid(),
  last_name: z.string().trim().min(1),
  notes: z.string().nullable(),
  orders: z.array(z.strictObject({ count: z.coerce.number().int().nonnegative() })),
  phone: z.string().trim().min(1),
  phone_normalized: z.string().regex(/^[1-9][0-9]{7,14}$/),
  updated_at: z.iso.datetime({ offset: true }),
}

export const adminCustomerRowSchema = z.strictObject(adminCustomerRowFields)
export const adminCustomerRowsSchema = z.array(z.strictObject(adminCustomerRowFields))

const adminCustomerOrderRowFields = {
  created_at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  order_number: z.string().trim().min(1),
  payment_method: z.enum(['bank_transfer', 'cash']),
  payment_status: z.enum(['paid', 'pending', 'rejected']),
  status: z.enum(['cancelled', 'confirmed', 'delivered', 'pending', 'picked_up', 'preparing', 'ready']),
  total: z.coerce.number().nonnegative(),
}

export const adminCustomerOrderRowsSchema = z.array(
  z.strictObject(adminCustomerOrderRowFields),
)
