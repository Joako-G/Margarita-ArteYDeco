import { z } from 'zod'

export const adminCategoryFiltersFormSchema = z.object({
  area: z.enum(['all', 'art', 'decoration']),
  pageSize: z.enum(['10', '20', '50']),
  publication: z.enum(['active', 'all', 'inactive']),
  search: z.string().trim().max(80, 'Ingresá hasta 80 caracteres')
    .refine((value) => value.length === 0 || value.length >= 2, {
      message: 'Ingresá al menos 2 caracteres',
    }),
  sort: z.enum(['nameAsc', 'nameDesc', 'newest', 'orderAsc', 'orderDesc']),
})

export type AdminCategoryFiltersFormType = z.infer<typeof adminCategoryFiltersFormSchema>
