export type ConsumerWithdrawalRequestStatusType =
  | 'applicable'
  | 'closed'
  | 'not_applicable'
  | 'received'
  | 'under_review'
  | 'verification_pending'
export type ConsumerWithdrawalReturnStatusType = 'inspected' | 'not_required' | 'pending' | 'received'
export type ConsumerWithdrawalRefundStatusType = 'failed' | 'manual_review' | 'not_required' | 'pending' | 'processing' | 'succeeded'

export interface IAdminConsumerWithdrawalFilters {
  compliance: 'all' | 'attention' | 'on_time'
  linkage: 'all' | 'linked' | 'unlinked'
  page: number
  pageSize: number
  search?: string
  sort: 'newest' | 'oldest' | 'urgent'
  status: 'all' | ConsumerWithdrawalRequestStatusType
}

export interface IAdminConsumerWithdrawalListItem {
  administrativeCode: string
  firstReviewDueAt: string | null
  id: string
  isDeadlineReviewRequired: boolean
  order: { id: string; orderNumber: string } | null
  requestStatus: ConsumerWithdrawalRequestStatusType
  submittedAt: string
  updatedAt: string
  version: number
}

export interface IAdminConsumerWithdrawalList {
  items: readonly IAdminConsumerWithdrawalListItem[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface IAdminConsumerWithdrawalEvent {
  actorLabel: string
  createdAt: string
  description: string
  id: string
  type: string
}

export interface IAdminConsumerWithdrawalDetail extends IAdminConsumerWithdrawalListItem {
  availableActions: readonly string[]
  comment: string | null
  deadline: {
    contractConcludedAt: string | null
    fulfillmentAt: string | null
    legalDeadlineAt: string | null
    status: 'apparently_in_time' | 'review_required' | 'unknown'
  }
  evaluation: { internalReason: string | null; publicExplanation: string | null }
  order: {
    deliveryMethod: 'pickup' | 'shipping'
    id: string
    orderNumber: string
    paymentMethod: 'bank_transfer' | 'cash'
    paymentStatus: 'paid' | 'pending' | 'rejected'
    status: string
    total: number
  } | null
  phone: string | null
  refund: {
    contractAmount: number
    method: 'bank_transfer' | 'cash' | null
    originalShippingAmount: number
    returnShippingAmount: number
    status: ConsumerWithdrawalRefundStatusType
    totalAmount: number
  }
  return: {
    items: readonly {
      nonRestockableQuantity: number | null
      orderItemId: string
      orderedQuantity: number
      productName: string
      restockableQuantity: number | null
    }[]
    status: ConsumerWithdrawalReturnStatusType
  }
  timeline: readonly IAdminConsumerWithdrawalEvent[]
}

export interface IAdminConsumerWithdrawalActionPayload {
  action: string
  confirmedTotalRefundAmount?: number
  expectedVersion: number
  reason: string
  publicExplanation?: string
  reference?: string
  returnItems?: readonly {
    nonRestockableQuantity: number
    orderItemId: string
    restockableQuantity: number
  }[]
  returnShippingRefundAmount?: number
}

export interface IAdminConsumerWithdrawalCandidate {
  createdAt: string
  deliveryMethod: 'pickup' | 'shipping'
  id: string
  itemSummary: string
  orderNumber: string
  paymentMethod: 'bank_transfer' | 'cash'
  status: string
  total: number
}

export interface IAdminConsumerWithdrawalContingencyPayload {
  note: string
  orderNumber?: string
  orderNumberUnavailable: boolean
  phone: string
  receivedAt: string
}
