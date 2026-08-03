import { z } from 'zod'

export const categoryFiltersSchema = z
  .object({
    catalogArea: z.enum(['art', 'decoration']).optional(),
  })
  .strict()

export const categoryRowsSchema = z.array(
  z.object({
    catalog_area: z.enum(['art', 'decoration']),
    description: z.string().nullable(),
    display_order: z.number().int().nonnegative(),
    id: z.uuid(),
    image_path: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
  }),
)
