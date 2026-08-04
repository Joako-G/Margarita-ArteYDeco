import { z } from 'zod'

export const adminProductFiltersFormSchema = z.object({
  pageSize: z.enum(['10', '20', '50']),
  publication: z.enum(['active', 'all', 'inactive']),
  search: z
    .string()
    .trim()
    .max(80, 'Ingresá hasta 80 caracteres')
    .refine((value) => value.length === 0 || value.length >= 2, {
      message: 'Ingresá al menos 2 caracteres',
    }),
  sort: z.enum(['nameAsc', 'nameDesc', 'newest', 'priceAsc', 'priceDesc', 'stockAsc', 'stockDesc']),
  stock: z.enum(['all', 'inStock', 'lowStock', 'outOfStock']),
})

export type AdminProductFiltersFormType = z.infer<typeof adminProductFiltersFormSchema>
