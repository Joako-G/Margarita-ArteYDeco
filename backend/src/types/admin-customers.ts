export type AdminCustomerSortType = 'nameAsc' | 'nameDesc' | 'newest' | 'oldest'

export interface IAdminCustomerFilters {
  page: number
  pageSize: number
  search?: string | undefined
  sort: AdminCustomerSortType
}

export interface IAdminCustomerOrderFilters {
  page: number
  pageSize: number
}

export interface IAdminCustomerRecord {
  createdAt: string
  firstName: string
  id: string
  lastName: string
  notes: string | null
  orderCount: number
  phone: string
  phoneNormalized: string
  updatedAt: string
}

export interface IAdminCustomerOrderRecord {
  createdAt: string
  id: string
  orderNumber: string
  paymentMethod: 'bank_transfer' | 'cash'
  paymentStatus: 'paid' | 'pending' | 'rejected'
  status: 'cancelled' | 'paid' | 'payment_pending' | 'pending' | 'picked_up' | 'preparing' | 'ready'
  total: number
}

export interface IAdminCustomerPage {
  items: IAdminCustomerRecord[]
  totalItems: number
}

export interface IAdminCustomerOrderPage {
  items: IAdminCustomerOrderRecord[]
  totalItems: number
}

export interface IAdminCustomerDto {
  createdAt: string
  firstName: string
  id: string
  lastName: string
  notes: string
  orderCount: number
  phone: string
  updatedAt: string
}

export interface IAdminCustomerListDto {
  items: IAdminCustomerDto[]
  pagination: IAdminPaginationDto
}

export interface IAdminCustomerDetailDto extends IAdminCustomerDto {
  orders: {
    items: IAdminCustomerOrderRecord[]
    pagination: IAdminPaginationDto
  }
}

export interface IAdminPaginationDto {
  hasNextPage: boolean
  hasPreviousPage: boolean
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface IAdminCustomerUpdateInput {
  expectedUpdatedAt: string
  firstName: string
  lastName: string
  notes: string | null
  phone: string
  phoneNormalized: string
}

export interface IAdminCustomerUpdateRequest {
  expectedUpdatedAt: string
  firstName: string
  lastName: string
  notes: string | null
  phone: string
}
