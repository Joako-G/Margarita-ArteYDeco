import { z } from 'zod'

const booleanQuerySchema = z.enum(['true', 'false']).transform((value) => value === 'true')

export const productFiltersSchema = z
  .object({
    catalogArea: z.enum(['art', 'decoration']).optional(),
    categorySlug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    featured: booleanQuerySchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(100),
    search: z.string().trim().min(2).max(80).optional(),
    sort: z.enum(['featured', 'name', 'newest', 'priceAsc', 'priceDesc']).default('featured'),
  })
  .strict()

export const productRowsSchema = z.array(
  z.object({
    category: z.object({
      catalog_area: z.enum(['art', 'decoration']),
      slug: z.string().min(1),
    }),
    category_id: z.uuid(),
    created_at: z.iso.datetime({ offset: true }),
    description: z.string().nullable(),
    id: z.uuid(),
    image_path: z.string().min(1).nullable(),
    is_featured: z.boolean(),
    name: z.string().min(1),
    price: z.coerce.number().positive(),
    slug: z.string().min(1),
    stock_quantity: z.number().int().nonnegative(),
    updated_at: z.iso.datetime({ offset: true }),
  }),
)
