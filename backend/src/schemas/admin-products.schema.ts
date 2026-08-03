import { z } from 'zod'

export const adminProductFiltersSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  publication: z.enum(['active', 'all', 'inactive']).default('all'),
  search: z.string().trim().min(2).max(80).optional(),
  sort: z.enum([
    'nameAsc',
    'nameDesc',
    'newest',
    'priceAsc',
    'priceDesc',
    'stockAsc',
    'stockDesc',
  ]).default('newest'),
  stock: z.enum(['all', 'inStock', 'lowStock', 'outOfStock']).default('all'),
})

export const adminProductSettingsRowSchema = z.strictObject({
  low_stock_threshold: z.coerce.number().int().nonnegative(),
})

export const adminProductRowsSchema = z.array(z.strictObject({
  category: z.strictObject({
    catalog_area: z.enum(['art', 'decoration']),
    name: z.string().trim().min(1),
  }),
  category_id: z.uuid(),
  id: z.uuid(),
  image_path: z.string().trim().min(1).nullable(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  name: z.string().trim().min(1),
  price: z.coerce.number().positive(),
  slug: z.string().trim().min(1),
  stock_quantity: z.coerce.number().int().nonnegative(),
  updated_at: z.iso.datetime({ offset: true }),
}))

const adminProductMutationFields = {
  categoryId: z.uuid(),
  description: z.string().trim().max(2_000).nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  name: z.string().trim().min(2).max(120),
  price: z.number().positive().max(9_999_999_999.99),
}

export const adminProductCreateSchema = z.strictObject({
  ...adminProductMutationFields,
  stockQuantity: z.number().int().nonnegative().max(2_147_483_647),
})

export const adminProductUpdateSchema = z.strictObject({
  ...adminProductMutationFields,
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
})

export const adminProductImageMutationSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
})

export const adminProductSoftDeleteSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
})

export const adminProductPublicationSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  isActive: z.boolean(),
})

export const adminProductFeaturedSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  isFeatured: z.boolean(),
})

export const adminProductIdParamsSchema = z.strictObject({
  productId: z.uuid(),
})

export const adminProductCategoryRowsSchema = z.array(z.strictObject({
  catalog_area: z.enum(['art', 'decoration']),
  id: z.uuid(),
  is_active: z.boolean(),
  name: z.string().trim().min(1),
}))

export const adminProductDetailRowSchema = z.strictObject({
  category: z.strictObject({
    catalog_area: z.enum(['art', 'decoration']),
    name: z.string().trim().min(1),
  }),
  category_id: z.uuid(),
  description: z.string().nullable(),
  id: z.uuid(),
  image_path: z.string().trim().min(1).nullable(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  name: z.string().trim().min(1),
  price: z.coerce.number().positive(),
  slug: z.string().trim().min(1),
  stock_quantity: z.coerce.number().int().nonnegative(),
  updated_at: z.iso.datetime({ offset: true }),
})

export const adminProductCategoryRowSchema = z.strictObject({
  catalog_area: z.enum(['art', 'decoration']),
  id: z.uuid(),
  is_active: z.boolean(),
  name: z.string().trim().min(1),
})
