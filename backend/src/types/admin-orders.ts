import type { DeliveryMethodType, PaymentMethodType } from './orders.js'

export type AdminOrderStatusType =
  | 'cancelled'
  | 'confirmed'
  | 'delivered'
  | 'pending'
  | 'picked_up'
  | 'preparing'
  | 'ready'

export type AdminPaymentStatusType = 'paid' | 'pending' | 'rejected'
export type AdminOrderActionType =
  | 'confirmPayment'
  | 'confirmOrder'
  | 'markDelivered'
  | 'markPickedUp'
  | 'markReady'
  | 'startPreparing'

export interface IAdminOrderFilters {
  page: number
  pageSize: number
  paymentMethod: 'all' | PaymentMethodType
  paymentStatus: 'all' | AdminPaymentStatusType
  search?: string | undefined
  sort: 'newest' | 'oldest' | 'totalAsc' | 'totalDesc'
  status: 'all' | AdminOrderStatusType
}

export interface IAdminOrderRecord {
  createdAt: string
  customerFirstName: string
  customerLastName: string
  customerPhone: string
  customerPhoneNormalized: string
  deliveryMethod: DeliveryMethodType
  discount: number
  id: string
  itemCount: number
  notes: string | null
  orderNumber: string
  paymentMethod: PaymentMethodType
  paymentStatus: AdminPaymentStatusType
  pickedUpAt: string | null
  shippingAddress: string | null
  status: AdminOrderStatusType
  subtotal: number
  total: number
  updatedAt: string
}

export interface IAdminOrderItemRecord {
  productName: string
  quantity: number
  subtotal: number
  unitPrice: number
}

export interface IAdminOrderPage {
  items: readonly IAdminOrderRecord[]
  totalItems: number
}

export interface IAdminOrderListItemDto {
  createdAt: string
  customer: {
    firstName: string
    lastName: string
    phone: string
  }
  deliveryMethod: DeliveryMethodType
  id: string
  itemCount: number
  orderNumber: string
  paymentMethod: PaymentMethodType
  paymentStatus: AdminPaymentStatusType
  status: AdminOrderStatusType
  total: number
  updatedAt: string
}

export interface IAdminOrderListDto {
  items: readonly IAdminOrderListItemDto[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface IAdminOrderDetailDto extends IAdminOrderListItemDto {
  availableActions: readonly AdminOrderActionType[]
  business: {
    address: string
    businessHours: string
    businessName: string
    mapsUrl: string
  }
  canCancel: boolean
  discount: number
  items: readonly IAdminOrderItemRecord[]
  notes: string
  pickedUpAt: string | null
  requiresManualRefundOnCancel: boolean
  shippingAddress: string | null
  subtotal: number
  whatsappPhone: string
}

export interface IAdminOrderActionRequest {
  action: AdminOrderActionType
  expectedUpdatedAt: string
}

export interface IAdminOrderCancellationRequest {
  confirmManualRefund: boolean
  expectedUpdatedAt: string
  reason: string
}
