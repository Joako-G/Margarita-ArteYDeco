import type { OrderStatusType } from '@/shared/utils/order-status'

export type AdminPaymentMethodType = 'bank_transfer' | 'cash' | 'mercado_pago'
export type AdminDeliveryMethodType = 'pickup' | 'shipping'
export type AdminPaymentStatusType = 'paid' | 'pending' | 'rejected'
export type AdminPaymentReconciliationStatusType =
  | 'approved'
  | 'cancelled'
  | 'dead_letter'
  | 'expired'
  | 'manual_review'
  | 'pending'
  | 'rejected'

export interface IAdminPaymentAuditEvent {
  actor: string
  createdAt: string
  description: string
  type: string
}

export interface IAdminPaymentTransaction {
  amount: number
  currency: string
  id: string
  lastError: string | null
  paymentTypeId: string | null
  providerPaymentId: string
  providerStatus: string | null
  providerUpdatedAt: string | null
  reviewRequired: boolean
  status: AdminPaymentReconciliationStatusType
  updatedAt: string
}

export interface IAdminPaymentAttempt {
  amount: number
  attemptNumber: number
  auditTimeline: readonly IAdminPaymentAuditEvent[]
  canRetry: boolean
  canReview: boolean
  canSync: boolean
  createdAt: string
  currency: string
  id: string
  lastError: string | null
  orderId: string
  orderNumber: string
  providerOrderId: string | null
  providerStatus: string | null
  providerUpdatedAt: string | null
  reservationExpiresAt: string
  status: AdminPaymentReconciliationStatusType
  transactions: readonly IAdminPaymentTransaction[]
  updatedAt: string
}

export interface IAdminPaymentReconciliation {
  items: readonly IAdminPaymentAttempt[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface IAdminPaymentReconciliationFilters {
  page: number
  pageSize: number
  status: 'all' | AdminPaymentReconciliationStatusType
}
export type AdminOrderActionType =
  | 'confirmPayment'
  | 'confirmOrder'
  | 'markDelivered'
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
  deliveryMethod: AdminDeliveryMethodType
  id: string
  itemCount: number
  orderNumber: string
  paymentMethod: AdminPaymentMethodType
  paymentProviderId: string | null
  paymentProviderStatus: string | null
  reservationExpiresAt?: string | null
  paymentReconciliationStatus: AdminPaymentReconciliationStatusType | null
  paymentStatus: AdminPaymentStatusType
  paymentUpdatedAt: string | null
  paymentRequiresManualReview: boolean
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
  items: readonly {
    listUnitPrice: number
    productName: string
    productDiscountPercentage: number
    quantity: number
    subtotal: number
    unitPrice: number
  }[]
  notes: string
  pickedUpAt: string | null
  requiresManualRefundOnCancel: boolean
  shippingAddress: string | null
  subtotal: number
  whatsappPhone: string
}

export interface IAdminOrderCancellationResult {
  order: IAdminOrderDetail
  stockRestored: true
}
