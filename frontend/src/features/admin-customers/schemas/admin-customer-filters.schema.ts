import { z } from 'zod'

export const adminCustomerFiltersFormSchema = z.strictObject({
  pageSize: z.enum(['10', '20', '50']),
  search: z.string().trim().max(80, 'Usá hasta 80 caracteres'),
  sort: z.enum(['nameAsc', 'nameDesc', 'newest', 'oldest']),
})

export type AdminCustomerFiltersFormType = z.infer<typeof adminCustomerFiltersFormSchema>
