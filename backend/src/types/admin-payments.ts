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

export interface IAdminPaymentTransactionDto {
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

export interface IAdminPaymentAttemptDto {
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
  transactions: readonly IAdminPaymentTransactionDto[]
  updatedAt: string
}

export interface IAdminPaymentReconciliationFilters {
  page: number
  pageSize: number
  status: 'all' | AdminPaymentReconciliationStatusType
}

export interface IAdminPaymentReconciliationDto {
  items: readonly IAdminPaymentAttemptDto[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export type AdminPaymentReviewDecisionType = 'acknowledge' | 'retry'

export interface IAdminPaymentReviewRequest {
  decision: AdminPaymentReviewDecisionType
  note?: string | undefined
}
