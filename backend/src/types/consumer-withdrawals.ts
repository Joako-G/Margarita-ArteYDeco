export type ConsumerWithdrawalRequestStatusType =
  | 'applicable'
  | 'closed'
  | 'received'
  | 'not_applicable'
  | 'under_review'
  | 'verification_pending'

export type ConsumerWithdrawalReturnStatusType =
  | 'inspected'
  | 'not_required'
  | 'pending'
  | 'received'

export type ConsumerWithdrawalRefundStatusType =
  | 'failed'
  | 'manual_review'
  | 'not_required'
  | 'pending'
  | 'processing'
  | 'succeeded'

export type ConsumerWithdrawalPublicStatusType =
  | 'applicable'
  | 'action_required'
  | 'closed'
  | 'not_applicable'
  | 'received'
  | 'under_review'

export type ConsumerWithdrawalActionType =
  | 'close'
  | 'confirmManualRefund'
  | 'correctManualRefund'
  | 'inspectReturn'
  | 'markRefundManualReview'
  | 'markRefundProcessing'
  | 'receiveReturn'
  | 'determineApplicable'
  | 'determineNotApplicable'
  | 'requestVerification'
  | 'startReview'

export interface ICreateConsumerWithdrawalRequest {
  captchaToken?: string | undefined
  comment?: string | undefined
  orderNumber?: string | undefined
  orderNumberUnavailable: boolean
  phone: string
}

export interface IConsumerWithdrawalAcknowledgementDto {
  message: string
  nextStep: string
  requestCode: string
  status: 'received'
  submittedAt: string
}

export interface IConsumerWithdrawalStatusDto {
  explanation: string
  nextStep: string
  status: ConsumerWithdrawalPublicStatusType
  submittedAt: string
  updatedAt: string
}

export interface IConsumerWithdrawalRecord {
  applicableAt: string | null
  acknowledgementIssuedAt: string
  closedAt: string | null
  contactPhoneNormalized: string
  createdAt: string
  customerComment: string | null
  firstReviewDueAt: string
  firstReviewedAt: string | null
  id: string
  legalDeadlineAt: string | null
  legalTimeBasis: string | null
  legalTimeStatus: 'apparently_in_time' | 'review_required' | 'unknown'
  orderId: string | null
  orderNumber: string | null
  orderReferenceInput: string | null
  orderReferenceUnavailable: boolean
  publicCodeSuffix: string
  publicExplanation: string | null
  refundStatus: ConsumerWithdrawalRefundStatusType
  notApplicableAt: string | null
  requestStatus: ConsumerWithdrawalRequestStatusType
  resolutionReason: string | null
  returnStatus: ConsumerWithdrawalReturnStatusType
  source: 'admin_whatsapp_contingency' | 'web'
  submittedAt: string
  updatedAt: string
  version: number
}

export interface IConsumerWithdrawalEventDto {
  actorLabel: string
  createdAt: string
  description: string
  id: string
  type: string
}

export interface IConsumerWithdrawalReturnItemDto {
  nonRestockableQuantity: number | null
  orderItemId: string
  orderedQuantity: number
  productName: string
  restockableQuantity: number | null
}

export interface IConsumerWithdrawalReturnItemInput {
  nonRestockableQuantity: number
  orderItemId: string
  restockableQuantity: number
}

export interface IConsumerWithdrawalListFilters {
  compliance: 'all' | 'attention' | 'on_time'
  linkage: 'all' | 'linked' | 'unlinked'
  page: number
  pageSize: number
  search?: string | undefined
  sort: 'newest' | 'oldest' | 'urgent'
  status: 'all' | ConsumerWithdrawalRequestStatusType
}

export interface IConsumerWithdrawalListItemDto {
  administrativeCode: string
  firstReviewDueAt: string
  id: string
  isDeadlineReviewRequired: boolean
  order: { id: string; orderNumber: string } | null
  requestStatus: ConsumerWithdrawalRequestStatusType
  submittedAt: string
  updatedAt: string
  version: number
}

export interface IConsumerWithdrawalListDto {
  items: readonly IConsumerWithdrawalListItemDto[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface IAdminConsumerWithdrawalDetailDto extends IConsumerWithdrawalListItemDto {
  availableActions: readonly ConsumerWithdrawalActionType[]
  comment: string | null
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
  phone: string
  refund: {
    contractAmount: number
    method: 'bank_transfer' | 'cash' | null
    originalShippingAmount: number
    returnShippingAmount: number
    status: ConsumerWithdrawalRefundStatusType
    totalAmount: number
  }
  return: {
    items: readonly IConsumerWithdrawalReturnItemDto[]
    status: ConsumerWithdrawalReturnStatusType
  }
  timeline: readonly IConsumerWithdrawalEventDto[]
}

export interface IAdminConsumerWithdrawalActionRequest {
  action: ConsumerWithdrawalActionType
  confirmedTotalRefundAmount?: number | undefined
  expectedVersion: number
  publicExplanation?: string | undefined
  reference?: string | undefined
  reason?: string | undefined
  returnItems?: readonly IConsumerWithdrawalReturnItemInput[] | undefined
  returnShippingRefundAmount?: number | undefined
}

export interface IAdminConsumerWithdrawalOrderLinkRequest {
  expectedVersion: number
  note: string
  orderId: string
}

export interface IAdminConsumerWithdrawalContingencyRequest {
  note: string
  orderNumber?: string | undefined
  orderNumberUnavailable: boolean
  phone: string
  receivedAt: string
}

export interface IConsumerWithdrawalOrderCandidateDto {
  createdAt: string
  deliveryMethod: 'pickup' | 'shipping'
  id: string
  itemSummary: string
  orderNumber: string
  paymentMethod: 'bank_transfer' | 'cash'
  status: string
  total: number
}
