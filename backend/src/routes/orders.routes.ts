import { Router } from 'express'

import type { IApplicationDependencies } from '../config/dependencies.js'
import type { IEnv } from '../config/env.js'
import {
  createCsrfValidationMiddleware,
  createOrderRateLimitMiddleware,
  createOriginValidationMiddleware,
} from '../middlewares/security.middleware.js'

export function createOrderRouter(
  dependencies: Pick<IApplicationDependencies, 'csrfService' | 'orderController'>,
  env: Pick<
    IEnv,
    'corsAllowedOrigins' | 'orderRateLimitMax' | 'orderRateLimitWindowMs'
  >,
): Router {
  const router = Router()

  router.post(
    '/',
    createOriginValidationMiddleware(env.corsAllowedOrigins),
    createOrderRateLimitMiddleware(env),
    createCsrfValidationMiddleware(dependencies.csrfService),
    dependencies.orderController.create,
  )

  return router
}
