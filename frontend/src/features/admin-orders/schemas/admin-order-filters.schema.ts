import { z } from 'zod'

export const adminOrderFiltersFormSchema = z.object({
  pageSize: z.enum(['10', '20', '50']),
  paymentMethod: z.enum(['all', 'bank_transfer', 'cash']),
  paymentStatus: z.enum(['all', 'paid', 'pending', 'rejected']),
  search: z.string().trim().max(80, 'Ingresá hasta 80 caracteres'),
  sort: z.enum(['newest', 'oldest', 'totalAsc', 'totalDesc']),
  status: z.enum([
    'all',
    'cancelled',
    'confirmed',
    'delivered',
    'pending',
    'picked_up',
    'preparing',
    'ready',
  ]),
})

export type AdminOrderFiltersFormType = z.infer<typeof adminOrderFiltersFormSchema>
