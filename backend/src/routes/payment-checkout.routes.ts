import { Router } from 'express'

import type { IApplicationDependencies } from '../config/dependencies.js'
import type { IEnv } from '../config/env.js'
import { createCsrfValidationMiddleware, createOriginValidationMiddleware } from '../middlewares/security.middleware.js'
import { validateBody, validateHeader, validateParams } from '../middlewares/validation.middleware.js'
import { paymentCheckoutBodySchema } from '../schemas/payment-checkout.schema.js'
import { idempotencyKeySchema, publicOrderParamsSchema } from '../schemas/orders.schema.js'

export function createPaymentCheckoutRouter(
  dependencies: Pick<IApplicationDependencies, 'csrfService' | 'paymentCheckoutController'>,
  env: Pick<IEnv, 'corsAllowedOrigins'>,
): Router {
  const router = Router()
  router.post(
    '/',
    createOriginValidationMiddleware(env.corsAllowedOrigins),
    createCsrfValidationMiddleware(dependencies.csrfService),
    validateBody(paymentCheckoutBodySchema),
    validateHeader(idempotencyKeySchema, 'idempotency-key', 'idempotencyKey'),
    dependencies.paymentCheckoutController.create,
  )
  if (typeof dependencies.paymentCheckoutController.getStatus === 'function') {
    router.get(
      '/:orderNumber/status',
      validateParams(publicOrderParamsSchema),
      dependencies.paymentCheckoutController.getStatus,
    )
  }
  if (typeof dependencies.paymentCheckoutController.resume === 'function') {
    router.get(
      '/:orderNumber',
      validateParams(publicOrderParamsSchema),
      dependencies.paymentCheckoutController.resume,
    )
  }
  return router
}
