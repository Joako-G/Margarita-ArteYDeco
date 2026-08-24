export type ConsumerWithdrawalPublicStatusType =
  | 'applicable'
  | 'action_required'
  | 'closed'
  | 'not_applicable'
  | 'received'
  | 'under_review'

export interface ICreateConsumerWithdrawalPayload {
  captchaToken?: string
  comment?: string
  orderNumber?: string
  orderNumberUnavailable: boolean
  phone: string
}

export interface IConsumerWithdrawalReceipt {
  message: string
  nextStep: string
  requestCode: string
  status: 'received'
  submittedAt: string
}

export interface IConsumerWithdrawalStatus {
  explanation?: string
  nextStep: string
  reviewChannel?: string
  status: ConsumerWithdrawalPublicStatusType
  submittedAt: string
  updatedAt: string
}

export interface IConsumerWithdrawalStatusPayload {
  captchaToken?: string
  requestCode: string
}
