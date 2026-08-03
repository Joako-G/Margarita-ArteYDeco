import { Router } from 'express'

import type { IApplicationDependencies } from '../config/dependencies.js'
import type { IEnv } from '../config/env.js'
import {
  createAdminAuthenticationMiddleware,
  requireAdministratorRole,
  setAdminPrivateHeaders,
} from '../middlewares/admin-auth.middleware.js'

export function createAdminDashboardRouter(
  dependencies: Pick<
    IApplicationDependencies,
    'adminAuthService' | 'adminDashboardController'
  >,
  env: Pick<IEnv, 'adminSessionMaxAgeMs'>,
): Router {
  const router = Router()
  const authenticate = createAdminAuthenticationMiddleware(
    dependencies.adminAuthService,
    env.adminSessionMaxAgeMs,
  )

  router.use(setAdminPrivateHeaders)
  router.use(authenticate, requireAdministratorRole)
  router.get('/', dependencies.adminDashboardController.getSummary)

  return router
}
