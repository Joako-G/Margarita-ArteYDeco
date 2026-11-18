export type PaymentProviderEnvironment = 'sandbox' | 'production'
export type PaymentTypeId = 'account_money' | 'debit_card'
export type PaymentOperation = 'create_preference' | 'get_payment' | 'get_preference'
export type ReconciledPaymentState = 'pending' | 'in_process' | 'approved' | 'rejected' | 'expired' | 'manual_review'

export interface CreatePaymentOrder {
  amount: number
  backUrls?: {
    failure: string
    pending: string
    success: string
  }
  currency: 'ARS'
  externalReference: string
  idempotencyKey: string
  items?: readonly PaymentOrderItem[]
}

export interface PaymentOrderItem {
  currency: 'ARS'
  quantity: number
  title: string
  unitPrice: number
}

export interface CreatedPaymentPreference {
  checkoutUrl: string
  providerPreferenceId: string
  providerStatus: string
}

export interface ProviderPayment {
  amount: number
  currency: string
  externalReference: string
  id: string
  paymentTypeId: string | null
  status: string
  updatedAt: string | null
  version: number | null
}

export interface ProviderPaymentTransaction {
  amount: number
  currency: string
  paymentTypeId: string | null
  providerPaymentId: string
  providerStatus: string
  status: ReconciledPaymentState
  updatedAt: string | null
  version: number | null
}

export interface PaymentProvider {
  createPreference(input: CreatePaymentOrder): Promise<CreatedPaymentPreference>
  getPreferenceCheckoutUrl?(preferenceId: string): Promise<string>
  getPayment(id: string): Promise<ProviderPayment>
  getPaymentsByExternalReference?(externalReference: string): Promise<readonly ProviderPayment[]>
  getMerchantOrderPaymentIds?(id: string): Promise<readonly string[]>
  getMerchantOrderPaymentId?(id: string): Promise<string>
}

export interface OrderPaymentSnapshot {
  amount: number
  attemptId: string
  items: readonly PaymentOrderItem[]
  orderId: string
  orderNumber: string
}
