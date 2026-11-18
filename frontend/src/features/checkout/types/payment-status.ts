export type PaymentStatusType = 'approved' | 'expired' | 'in_process' | 'manual_review' | 'pending' | 'rejected'

export interface IPaymentStatus {
  nextAction: 'contact_support' | 'recover' | 'refresh' | 'view_order'
  orderNumber: string
  reservationExpiresAt: string
  status: PaymentStatusType
}
