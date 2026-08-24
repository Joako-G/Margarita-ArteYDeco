import { Router } from 'express'

import type { IApplicationDependencies } from '../config/dependencies.js'
import type { IEnv } from '../config/env.js'
import { createAdminAuthenticationMiddleware, requireAdministratorRole, setAdminPrivateHeaders } from '../middlewares/admin-auth.middleware.js'
import { createAdminOperationRateLimitMiddleware, createCsrfValidationMiddleware, createOriginValidationMiddleware } from '../middlewares/security.middleware.js'
import { validateHeader } from '../middlewares/validation.middleware.js'
import { idempotencyKeySchema } from '../schemas/orders.schema.js'

export function createAdminConsumerWithdrawalRouter(
  dependencies: Pick<IApplicationDependencies, 'adminAuthService' | 'adminConsumerWithdrawalController' | 'csrfService'>,
  env: Pick<IEnv, 'adminSessionMaxAgeMs' | 'adminOperationRateLimitMax' | 'adminOperationRateLimitWindowMs' | 'corsAllowedOrigins' | 'redisUrl'>,
): Router {
  const router = Router()
  const authenticate = createAdminAuthenticationMiddleware(dependencies.adminAuthService, env.adminSessionMaxAgeMs)
  const protectWrite = [
    createOriginValidationMiddleware(env.corsAllowedOrigins),
    createCsrfValidationMiddleware(dependencies.csrfService),
  ]

  router.use(setAdminPrivateHeaders)
  router.use(authenticate, requireAdministratorRole, createAdminOperationRateLimitMiddleware(env))
  router.get('/', dependencies.adminConsumerWithdrawalController.list)
  router.post('/contingency', ...protectWrite, validateHeader(idempotencyKeySchema, 'idempotency-key', 'idempotencyKey'), dependencies.adminConsumerWithdrawalController.createContingency)
  router.get('/:requestId', dependencies.adminConsumerWithdrawalController.getById)
  router.get('/:requestId/order-candidates', dependencies.adminConsumerWithdrawalController.getOrderCandidates)
  router.post('/:requestId/actions', ...protectWrite, validateHeader(idempotencyKeySchema, 'idempotency-key', 'idempotencyKey'), dependencies.adminConsumerWithdrawalController.executeAction)
  router.post('/:requestId/order-link', ...protectWrite, validateHeader(idempotencyKeySchema, 'idempotency-key', 'idempotencyKey'), dependencies.adminConsumerWithdrawalController.linkOrder)
  return router
}
