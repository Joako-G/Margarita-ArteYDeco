import { z } from 'zod'

export const adminCategoryFiltersSchema = z.strictObject({
  area: z.enum(['all', 'art', 'decoration']).default('all'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  publication: z.enum(['active', 'all', 'inactive']).default('all'),
  search: z.string().trim().min(2).max(80).optional(),
  sort: z.enum(['nameAsc', 'nameDesc', 'newest', 'orderAsc', 'orderDesc'])
    .default('orderAsc'),
})

const adminCategoryMutationFields = {
  catalogArea: z.enum(['art', 'decoration']),
  description: z.string().trim().max(1_000).nullable(),
  displayOrder: z.number().int().nonnegative().max(2_147_483_647),
  name: z.string().trim().min(2).max(100),
}

export const adminCategoryCreateSchema = z.strictObject(adminCategoryMutationFields)

export const adminCategoryUpdateSchema = z.strictObject({
  ...adminCategoryMutationFields,
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  isActive: z.boolean(),
})

export const adminCategoryPublicationSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  isActive: z.boolean(),
})

export const adminCategoryImageMutationSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
})

export const adminCategorySoftDeleteSchema = adminCategoryImageMutationSchema

export const adminCategoryIdParamsSchema = z.strictObject({ categoryId: z.uuid() })

const adminCategoryRowFields = {
  catalog_area: z.enum(['art', 'decoration']),
  description: z.string().nullable(),
  display_order: z.coerce.number().int().nonnegative(),
  id: z.uuid(),
  image_path: z.string().trim().min(1),
  is_active: z.boolean(),
  name: z.string().trim().min(1),
  products: z.array(z.strictObject({ count: z.coerce.number().int().nonnegative() })),
  slug: z.string().trim().min(1),
  updated_at: z.iso.datetime({ offset: true }),
}

export const adminCategoryRowSchema = z.strictObject(adminCategoryRowFields)
export const adminCategoryRowsSchema = z.array(z.strictObject(adminCategoryRowFields))
