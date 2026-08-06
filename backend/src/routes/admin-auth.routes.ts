import { Router } from 'express'

import type { IApplicationDependencies } from '../config/dependencies.js'
import type { IEnv } from '../config/env.js'
import {
  createAdminAuthenticationMiddleware,
  requireAdministratorRole,
  setAdminPrivateHeaders,
} from '../middlewares/admin-auth.middleware.js'
import {
  createAdminLoginRateLimitMiddleware,
  createCsrfValidationMiddleware,
  createOriginValidationMiddleware,
} from '../middlewares/security.middleware.js'

export function createAdminAuthRouter(
  dependencies: Pick<
    IApplicationDependencies,
    'adminAuthController' | 'adminAuthService' | 'csrfController' | 'csrfService'
  >,
  env: Pick<
    IEnv,
    | 'adminLoginRateLimitMax'
    | 'adminLoginRateLimitWindowMs'
    | 'adminSessionMaxAgeMs'
     | 'corsAllowedOrigins'
     | 'redisUrl'
  >,
): Router {
  const router = Router()
  const verifyOrigin = createOriginValidationMiddleware(env.corsAllowedOrigins)
  const verifyCsrf = createCsrfValidationMiddleware(dependencies.csrfService)
  const authenticate = createAdminAuthenticationMiddleware(
    dependencies.adminAuthService,
    env.adminSessionMaxAgeMs,
  )

  router.use(setAdminPrivateHeaders)
  router.get('/csrf-token', dependencies.csrfController.getToken)
  router.post(
    '/login',
    verifyOrigin,
    createAdminLoginRateLimitMiddleware(env),
    verifyCsrf,
    dependencies.adminAuthController.login,
  )
  router.get(
    '/session',
    authenticate,
    requireAdministratorRole,
    dependencies.adminAuthController.getSession,
  )
  router.post('/logout', verifyOrigin, verifyCsrf, dependencies.adminAuthController.logout)
  router.get(
    '/profile',
    authenticate,
    requireAdministratorRole,
    dependencies.adminAuthController.getProfile,
  )

  return router
}
