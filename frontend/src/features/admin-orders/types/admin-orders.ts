import type { OrderStatusType } from '@/shared/utils/order-status'

export type AdminPaymentMethodType = 'bank_transfer' | 'cash'
export type AdminPaymentStatusType = 'paid' | 'pending' | 'rejected'
export type AdminOrderActionType =
  | 'confirmPayment'
  | 'markPickedUp'
  | 'markReady'
  | 'startPreparing'
export type AdminOrderSortType = 'newest' | 'oldest' | 'totalAsc' | 'totalDesc'

export interface IAdminOrderFilters {
  page: number
  pageSize: number
  paymentMethod: 'all' | AdminPaymentMethodType
  paymentStatus: 'all' | AdminPaymentStatusType
  search?: string
  sort: AdminOrderSortType
  status: 'all' | OrderStatusType
}

export interface IAdminOrderListItem {
  createdAt: string
  customer: {
    firstName: string
    lastName: string
    phone: string
  }
  id: string
  itemCount: number
  orderNumber: string
  paymentMethod: AdminPaymentMethodType
  paymentStatus: AdminPaymentStatusType
  status: OrderStatusType
  total: number
  updatedAt: string
}

export interface IAdminOrderList {
  items: readonly IAdminOrderListItem[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface IAdminOrderDetail extends IAdminOrderListItem {
  availableActions: readonly AdminOrderActionType[]
  business: {
    address: string
    businessHours: string
    businessName: string
    mapsUrl: string
  }
  canCancel: boolean
  discount: number
  items: readonly {
    productName: string
    quantity: number
    subtotal: number
    unitPrice: number
  }[]
  notes: string
  pickedUpAt: string | null
  requiresManualRefundOnCancel: boolean
  subtotal: number
  whatsappPhone: string
}

export interface IAdminOrderCancellationResult {
  order: IAdminOrderDetail
  stockRestored: true
}
