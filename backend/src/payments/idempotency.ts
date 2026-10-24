import { createHash } from 'node:crypto'

import type { PaymentOperation } from './types.js'

export function createPaymentIdempotencyKey(
  orderId: string,
  attemptId: string,
  operation: PaymentOperation,
): string {
  const digest = createHash('sha256')
    .update(`${orderId}:${attemptId}:${operation}`)
    .digest('hex')

  return `margarita:mercado-pago:${operation}:${digest}`
}
