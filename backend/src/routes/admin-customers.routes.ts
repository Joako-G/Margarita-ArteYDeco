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

export function createAdminCustomerRouter(
  dependencies: Pick<
    IApplicationDependencies,
    'adminAuthService' | 'adminCustomerController' | 'csrfService'
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
  router.get('/', dependencies.adminCustomerController.list)
  router.get('/:customerId', dependencies.adminCustomerController.getById)
  router.put('/:customerId', ...protectWrite, dependencies.adminCustomerController.update)
  router.delete('/:customerId', ...protectWrite, dependencies.adminCustomerController.softDelete)

  return router
}
