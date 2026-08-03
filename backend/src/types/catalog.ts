export type CatalogAreaType = 'art' | 'decoration'

export interface ICategoryRow {
  catalogArea: CatalogAreaType
  description: string | null
  displayOrder: number
  id: string
  imagePath: string
  name: string
  slug: string
}

export interface IProductRow {
  catalogArea: CatalogAreaType
  categoryId: string
  createdAt: string
  description: string | null
  id: string
  imagePath: string | null
  isFeatured: boolean
  name: string
  price: number
  slug: string
  stockQuantity: number
  updatedAt: string
}

export interface IPublicCategoryDto {
  catalogArea: CatalogAreaType
  description: string
  displayOrder: number
  id: string
  imageUrl: string | null
  name: string
  slug: string
}

export interface IPublicProductDto {
  categoryId: string
  createdAt: string
  description: string
  id: string
  imageUrl: string | null
  isFeatured: boolean
  name: string
  price: number
  slug: string
  stockQuantity: number
  updatedAt: string
}

export interface ICategoryFilters {
  catalogArea?: CatalogAreaType | undefined
}

export type ProductSortType = 'featured' | 'name' | 'newest' | 'priceAsc' | 'priceDesc'

export interface IProductFilters {
  catalogArea?: CatalogAreaType | undefined
  categorySlug?: string | undefined
  featured?: boolean | undefined
  limit: number
  search?: string | undefined
  sort: ProductSortType
}
