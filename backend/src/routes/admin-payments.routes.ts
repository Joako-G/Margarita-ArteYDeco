import { Router } from 'express'

import type { IApplicationDependencies } from '../config/dependencies.js'
import type { IEnv } from '../config/env.js'
import { createAdminAuthenticationMiddleware, requireAdministratorRole, setAdminPrivateHeaders } from '../middlewares/admin-auth.middleware.js'
import { createAdminOperationRateLimitMiddleware, createCsrfValidationMiddleware, createOriginValidationMiddleware } from '../middlewares/security.middleware.js'

export function createAdminPaymentRouter(
  dependencies: Pick<IApplicationDependencies, 'adminAuthService' | 'adminPaymentController' | 'csrfService'>,
  env: Pick<IEnv, 'adminSessionMaxAgeMs' | 'adminOperationRateLimitMax' | 'adminOperationRateLimitWindowMs' | 'corsAllowedOrigins' | 'redisUrl'>,
): Router {
  const router = Router()
  const authenticate = createAdminAuthenticationMiddleware(dependencies.adminAuthService, env.adminSessionMaxAgeMs)
  const protectWrite = [createOriginValidationMiddleware(env.corsAllowedOrigins), createCsrfValidationMiddleware(dependencies.csrfService)]
  router.use(setAdminPrivateHeaders, authenticate, requireAdministratorRole, createAdminOperationRateLimitMiddleware(env))
  router.get('/reconciliation', dependencies.adminPaymentController.list)
  router.post('/:attemptId/retry', ...protectWrite, dependencies.adminPaymentController.retry)
  router.post('/:attemptId/sync', ...protectWrite, dependencies.adminPaymentController.sync)
  router.post('/:attemptId/review', ...protectWrite, dependencies.adminPaymentController.review)
  return router
}
