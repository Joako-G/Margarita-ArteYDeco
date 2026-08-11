export type AdminCategoryAreaType = 'art' | 'decoration'
export type AdminCategoryAreaFilterType = 'all' | AdminCategoryAreaType
export type AdminCategoryPublicationFilterType = 'active' | 'all' | 'inactive'
export type AdminCategorySortType = 'nameAsc' | 'nameDesc' | 'newest' | 'orderAsc' | 'orderDesc'

export interface IAdminCategoryFilters {
  area: AdminCategoryAreaFilterType
  page: number
  pageSize: number
  publication: AdminCategoryPublicationFilterType
  search?: string
  sort: AdminCategorySortType
}

export interface IAdminCategory {
  catalogArea: AdminCategoryAreaType
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

export interface IAdminCategoryList {
  items: readonly IAdminCategory[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface IAdminCategoryCreatePayload {
  catalogArea: AdminCategoryAreaType
  description: string | null
  name: string
}

export interface IAdminCategoryUpdateFields extends IAdminCategoryCreatePayload {
  displayOrder: number
}

export interface IAdminCategoryUpdatePayload extends IAdminCategoryUpdateFields {
  expectedUpdatedAt: string
  isActive: boolean
}

export interface IAdminCategorySaveInput {
  image?: File
  isActive: boolean
  payload: IAdminCategoryCreatePayload
}

export interface IAdminCategorySaveResult {
  category: IAdminCategory
  imageWarning: boolean
}

export type AdminCategoryLifecycleMutationInputType =
  | { action: 'delete'; category: IAdminCategory }
  | { action: 'publication'; category: IAdminCategory; value: boolean }

export type AdminCategoryLifecycleActionType =
  AdminCategoryLifecycleMutationInputType['action']
