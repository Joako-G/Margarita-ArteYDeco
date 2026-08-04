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

export function createAdminProfileRouter(
  dependencies: Pick<
    IApplicationDependencies,
    'adminAuthService' | 'adminProfileController' | 'csrfService'
  >,
  env: Pick<IEnv, 'adminSessionMaxAgeMs' | 'corsAllowedOrigins'>,
): Router {
  const router = Router()
  const protectWrite = [
    createOriginValidationMiddleware(env.corsAllowedOrigins),
    createCsrfValidationMiddleware(dependencies.csrfService),
  ]

  router.use(setAdminPrivateHeaders)
  router.use(
    createAdminAuthenticationMiddleware(dependencies.adminAuthService, env.adminSessionMaxAgeMs),
    requireAdministratorRole,
  )
  router.get('/', dependencies.adminProfileController.get)
  router.put('/name', ...protectWrite, dependencies.adminProfileController.updateFullName)
  router.put('/email', ...protectWrite, dependencies.adminProfileController.requestEmailChange)
  router.put('/password', ...protectWrite, dependencies.adminProfileController.updatePassword)

  return router
}
