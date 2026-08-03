import type { CatalogAreaType } from './catalog.js'

export type AdminProductPublicationFilterType = 'active' | 'all' | 'inactive'
export type AdminProductStockFilterType = 'all' | 'inStock' | 'lowStock' | 'outOfStock'
export type AdminProductSortType =
  | 'nameAsc'
  | 'nameDesc'
  | 'newest'
  | 'priceAsc'
  | 'priceDesc'
  | 'stockAsc'
  | 'stockDesc'

export interface IAdminProductFilters {
  page: number
  pageSize: number
  publication: AdminProductPublicationFilterType
  search?: string | undefined
  sort: AdminProductSortType
  stock: AdminProductStockFilterType
}

export interface IAdminProductRow {
  catalogArea: CatalogAreaType
  categoryId: string
  categoryName: string
  id: string
  imagePath: string | null
  isActive: boolean
  isFeatured: boolean
  name: string
  price: number
  slug: string
  stockQuantity: number
  updatedAt: string
}

export interface IAdminProductPage {
  items: readonly IAdminProductRow[]
  lowStockThreshold: number
  totalItems: number
}

export interface IAdminProductCategoryOption {
  catalogArea: CatalogAreaType
  id: string
  isActive: boolean
  name: string
}

export interface IAdminProductRecord extends IAdminProductRow {
  description: string | null
}

export interface IAdminProductMutationInput {
  categoryId: string
  description: string | null
  isActive: boolean
  isFeatured: boolean
  name: string
  price: number
  slug: string
}

export interface IAdminProductCreateInput extends IAdminProductMutationInput {
  stockQuantity: number
}

export interface IAdminProductUpdateInput extends IAdminProductMutationInput {
  expectedUpdatedAt: string
}

export interface IAdminProductStateUpdateInput {
  expectedUpdatedAt: string
  isActive?: boolean
  isFeatured?: boolean
}

export type AdminProductCreateRequestType = Omit<IAdminProductCreateInput, 'slug'>
export type AdminProductUpdateRequestType = Omit<IAdminProductUpdateInput, 'slug'>

export interface IAdminProductPublicationRequest {
  expectedUpdatedAt: string
  isActive: boolean
}

export interface IAdminProductFeaturedRequest {
  expectedUpdatedAt: string
  isFeatured: boolean
}

export interface IAdminProductDetailDto {
  catalogArea: CatalogAreaType
  category: {
    id: string
    name: string
  }
  description: string
  id: string
  imageUrl: string | null
  isActive: boolean
  isFeatured: boolean
  name: string
  price: number
  slug: string
  stockQuantity: number
  updatedAt: string
}

export interface IAdminProductListDto {
  items: readonly {
    catalogArea: CatalogAreaType
    category: {
      id: string
      name: string
    }
    id: string
    imageUrl: string | null
    isActive: boolean
    isFeatured: boolean
    name: string
    price: number
    slug: string
    stockQuantity: number
    stockStatus: 'inStock' | 'lowStock' | 'outOfStock'
    updatedAt: string
  }[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}
