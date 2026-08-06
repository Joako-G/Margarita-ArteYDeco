import { Router } from 'express'

import type { IApplicationDependencies } from '../config/dependencies.js'
import type { IEnv } from '../config/env.js'
import {
  createCsrfValidationMiddleware,
  createOrderRateLimitMiddleware,
  createOriginValidationMiddleware,
} from '../middlewares/security.middleware.js'
import { validateBody, validateHeader } from '../middlewares/validation.middleware.js'
import { createOrderBodySchema, idempotencyKeySchema } from '../schemas/orders.schema.js'

export function createOrderRouter(
  dependencies: Pick<IApplicationDependencies, 'csrfService' | 'orderController'>,
  env: Pick<
    IEnv,
    'corsAllowedOrigins' | 'orderRateLimitMax' | 'orderRateLimitWindowMs' | 'redisUrl'
  >,
): Router {
  const router = Router()

  router.post(
    '/',
    createOriginValidationMiddleware(env.corsAllowedOrigins),
    createOrderRateLimitMiddleware(env),
    createCsrfValidationMiddleware(dependencies.csrfService),
    validateBody(createOrderBodySchema),
    validateHeader(idempotencyKeySchema, 'idempotency-key', 'idempotencyKey'),
    dependencies.orderController.create,
  )

  return router
}
