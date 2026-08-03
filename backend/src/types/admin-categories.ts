import type { CatalogAreaType } from './catalog.js'

export type AdminCategoryAreaFilterType = 'all' | CatalogAreaType
export type AdminCategoryPublicationFilterType = 'active' | 'all' | 'inactive'
export type AdminCategorySortType = 'nameAsc' | 'nameDesc' | 'newest' | 'orderAsc' | 'orderDesc'

export interface IAdminCategoryFilters {
  area: AdminCategoryAreaFilterType
  page: number
  pageSize: number
  publication: AdminCategoryPublicationFilterType
  search?: string | undefined
  sort: AdminCategorySortType
}

export interface IAdminCategoryRecord {
  catalogArea: CatalogAreaType
  description: string | null
  displayOrder: number
  id: string
  imagePath: string
  isActive: boolean
  name: string
  productCount: number
  slug: string
  updatedAt: string
}

export interface IAdminCategoryPage {
  items: readonly IAdminCategoryRecord[]
  totalItems: number
}

export interface IAdminCategoryCreateInput {
  catalogArea: CatalogAreaType
  description: string | null
  displayOrder: number
  id: string
  imagePath: string
  name: string
  slug: string
}

export interface IAdminCategoryUpdateInput {
  catalogArea: CatalogAreaType
  description: string | null
  displayOrder: number
  expectedUpdatedAt: string
  isActive: boolean
  name: string
  slug: string
}

export interface IAdminCategoryPublicationRequest {
  expectedUpdatedAt: string
  isActive: boolean
}

export interface IAdminCategoryDetailDto {
  catalogArea: CatalogAreaType
  description: string
  displayOrder: number
  id: string
  imageUrl: string | null
  isActive: boolean
  name: string
  productCount: number
  slug: string
  updatedAt: string
}

export interface IAdminCategoryListDto {
  items: readonly IAdminCategoryDetailDto[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export type AdminCategoryCreateRequestType = Pick<
  IAdminCategoryCreateInput,
  'catalogArea' | 'description' | 'displayOrder' | 'name'
>

export type AdminCategoryUpdateRequestType = Omit<IAdminCategoryUpdateInput, 'slug'>
