import type { PaymentTypeId } from './types.js'

export const MERCADO_PAGO_PAYMENT_TYPES = ['account_money', 'debit_card'] as const

export function isAllowedPaymentType(value: string): value is PaymentTypeId {
  return (MERCADO_PAGO_PAYMENT_TYPES as readonly string[]).includes(value)
}

export function assertAllowedPaymentType(value: string): PaymentTypeId {
  if (!isAllowedPaymentType(value)) {
    throw new Error(`Unsupported Mercado Pago payment type: ${value}`)
  }

  return value
}
