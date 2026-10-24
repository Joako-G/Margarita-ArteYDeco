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
export type AdminPaymentReconciliationStatusType =
  | 'approved'
  | 'cancelled'
  | 'expired'
  | 'manual_review'
  | 'pending'
  | 'rejected'
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
  inventoryAllocationActive?: boolean
  contractConcludedAt: string | null
  createdAt: string
  customerFirstName: string
  customerLastName: string
  customerPhone: string
  customerPhoneNormalized: string
  deliveryMethod: DeliveryMethodType
  discount: number
  deliveredAt: string | null
  id: string
  itemCount: number
  notes: string | null
  orderNumber: string
  paymentMethod: PaymentMethodType
  paymentProviderId: string | null
  paymentAttemptId?: string | null
  paymentAttemptStatus?: AdminPaymentReconciliationStatusType | null
  paymentProviderStatus: string | null
  reservationExpiresAt?: string | null
  paymentReconciliationStatus: AdminPaymentReconciliationStatusType | null
  persistedPaymentStatus: AdminPaymentStatusType
  paymentStatus: AdminPaymentStatusType
  paymentUpdatedAt: string | null
  paymentRequiresManualReview: boolean
  pickedUpAt: string | null
  shippingAddress: string | null
  status: AdminOrderStatusType
  subtotal: number
  total: number
  updatedAt: string
}

export interface IAdminOrderItemRecord {
  listUnitPrice: number
  productName: string
  productDiscountPercentage: number
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
  paymentProviderId: string | null
  paymentProviderStatus: string | null
  reservationExpiresAt?: string | null
  paymentReconciliationStatus: AdminPaymentReconciliationStatusType | null
  paymentStatus: AdminPaymentStatusType
  paymentUpdatedAt: string | null
  paymentRequiresManualReview: boolean
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
  canConsultPayment: boolean
  inventoryAllocationActive: boolean
  paymentAttemptId: string | null
  reservationExpiresAt: string | null
  business: {
    address: string
    businessHours: string
    businessName: string
    mapsUrl: string
  }
  canCancel: boolean
  contractConcludedAt: string | null
  deliveredAt: string | null
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
