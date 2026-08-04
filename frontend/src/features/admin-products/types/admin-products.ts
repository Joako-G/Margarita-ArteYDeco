export type AdminProductCatalogAreaType = 'art' | 'decoration'
export type AdminProductPublicationFilterType = 'active' | 'all' | 'inactive'
export type AdminProductStockFilterType = 'all' | 'inStock' | 'lowStock' | 'outOfStock'
export type AdminProductSortType =
  'nameAsc' | 'nameDesc' | 'newest' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc'

export interface IAdminProductFilters {
  page: number
  pageSize: number
  publication: AdminProductPublicationFilterType
  search?: string
  sort: AdminProductSortType
  stock: AdminProductStockFilterType
}

export interface IAdminProduct {
  catalogArea: AdminProductCatalogAreaType
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
  stockStatus: Exclude<AdminProductStockFilterType, 'all'>
  updatedAt: string
}

export interface IAdminProductList {
  items: readonly IAdminProduct[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface IAdminProductCategoryOption {
  catalogArea: 'art' | 'decoration'
  id: string
  isActive: boolean
  name: string
}

export interface IAdminProductDetail {
  catalogArea: 'art' | 'decoration'
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

export interface IAdminProductCreatePayload {
  categoryId: string
  description: string | null
  isActive: boolean
  isFeatured: boolean
  name: string
  price: number
  stockQuantity: number
}

export interface IAdminProductUpdatePayload extends Omit<IAdminProductCreatePayload, 'stockQuantity'> {
  expectedUpdatedAt: string
}

export interface IAdminProductSaveInput {
  image?: File
  payload: IAdminProductCreatePayload
  removeCurrentImage?: boolean
}

export interface IAdminProductSaveResult {
  imageWarning: boolean
  product: IAdminProductDetail
}

export type AdminProductLifecycleActionType = 'delete' | 'featured' | 'publication'

export type AdminProductLifecycleMutationInputType =
  | { action: 'delete'; product: IAdminProduct }
  | { action: 'featured'; product: IAdminProduct; value: boolean }
  | { action: 'publication'; product: IAdminProduct; value: boolean }
