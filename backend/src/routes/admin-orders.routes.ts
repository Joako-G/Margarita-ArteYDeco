import { Router } from 'express'

import type { IApplicationDependencies } from '../config/dependencies.js'
import type { IEnv } from '../config/env.js'
import {
  createAdminAuthenticationMiddleware,
  requireAdministratorRole,
  setAdminPrivateHeaders,
} from '../middlewares/admin-auth.middleware.js'
import {
  createCsrfValidationMiddleware,
  createOriginValidationMiddleware,
} from '../middlewares/security.middleware.js'

export function createAdminOrderRouter(
  dependencies: Pick<
    IApplicationDependencies,
    'adminAuthService' | 'adminOrderController' | 'csrfService'
  >,
  env: Pick<IEnv, 'adminSessionMaxAgeMs' | 'corsAllowedOrigins'>,
): Router {
  const router = Router()
  const authenticate = createAdminAuthenticationMiddleware(
    dependencies.adminAuthService,
    env.adminSessionMaxAgeMs,
  )
  const protectWrite = [
    createOriginValidationMiddleware(env.corsAllowedOrigins),
    createCsrfValidationMiddleware(dependencies.csrfService),
  ]

  router.use(setAdminPrivateHeaders)
  router.use(authenticate, requireAdministratorRole)
  router.get('/', dependencies.adminOrderController.list)
  router.get('/:orderId', dependencies.adminOrderController.getById)
  router.post('/:orderId/actions', ...protectWrite, dependencies.adminOrderController.executeAction)
  router.post('/:orderId/cancellation', ...protectWrite, dependencies.adminOrderController.cancel)

  return router
}
