import type { Logger } from 'pino'

import type { PaymentOperation, PaymentProviderEnvironment } from './types.js'

export interface PaymentLogContext {
  attemptId?: string
  environment: PaymentProviderEnvironment
  operation: PaymentOperation
  orderId?: string
}

export function logPaymentEvent(
  logger: Logger,
  level: 'info' | 'warn' | 'error',
  context: PaymentLogContext,
  message: string,
): void {
  const safeContext = {
    attemptId: context.attemptId,
    environment: context.environment,
    operation: context.operation,
    orderId: context.orderId,
    provider: 'mercado_pago',
  }

  logger[level](safeContext, message)
}
