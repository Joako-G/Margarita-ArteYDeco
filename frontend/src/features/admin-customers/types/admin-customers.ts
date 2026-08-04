import type { OrderStatusType } from '@/shared/utils/order-status'

export type AdminCustomerSortType = 'nameAsc' | 'nameDesc' | 'newest' | 'oldest'

export interface IAdminCustomerFilters {
  page: number
  pageSize: number
  search?: string
  sort: AdminCustomerSortType
}

export interface IAdminCustomer {
  createdAt: string
  firstName: string
  id: string
  lastName: string
  notes: string
  orderCount: number
  phone: string
  updatedAt: string
}

export interface IAdminCustomerList {
  items: readonly IAdminCustomer[]
  pagination: IAdminCustomerPagination
}

export interface IAdminCustomerPagination {
  hasNextPage: boolean
  hasPreviousPage: boolean
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface IAdminCustomerOrder {
  createdAt: string
  id: string
  orderNumber: string
  paymentMethod: 'bank_transfer' | 'cash'
  paymentStatus: 'paid' | 'pending' | 'rejected'
  status: OrderStatusType
  total: number
}

export interface IAdminCustomerDetail extends IAdminCustomer {
  orders: {
    items: readonly IAdminCustomerOrder[]
    pagination: IAdminCustomerPagination
  }
}

export interface IAdminCustomerUpdatePayload {
  expectedUpdatedAt: string
  firstName: string
  lastName: string
  notes: string | null
  phone: string
}
