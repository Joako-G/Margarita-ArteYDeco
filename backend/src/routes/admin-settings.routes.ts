import { raw, Router } from 'express'

import type { IApplicationDependencies } from '../config/dependencies.js'
import type { IEnv } from '../config/env.js'
import {
  createAdminAuthenticationMiddleware,
  requireAdministratorRole,
  setAdminPrivateHeaders,
} from '../middlewares/admin-auth.middleware.js'
import {
  createAdminOperationRateLimitMiddleware,
  createCsrfValidationMiddleware,
  createOriginValidationMiddleware,
} from '../middlewares/security.middleware.js'
import { PRODUCT_IMAGE_MAX_BYTES } from '../utils/product-image.js'

export function createAdminSettingsRouter(
  dependencies: Pick<
    IApplicationDependencies,
    'adminAuthService' | 'adminSettingsController' | 'csrfService'
  >,
  env: Pick<IEnv, 'adminSessionMaxAgeMs' | 'adminOperationRateLimitMax' | 'adminOperationRateLimitWindowMs' | 'corsAllowedOrigins' | 'redisUrl'>,
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
  router.use(authenticate, requireAdministratorRole, createAdminOperationRateLimitMiddleware(env))
  router.get('/', dependencies.adminSettingsController.get)
  router.put('/', ...protectWrite, dependencies.adminSettingsController.update)
  router.put(
    '/logo',
    ...protectWrite,
    raw({ limit: PRODUCT_IMAGE_MAX_BYTES, type: ['image/jpeg', 'image/png', 'image/webp'] }),
    dependencies.adminSettingsController.replaceLogo,
  )
  router.delete('/logo', ...protectWrite, dependencies.adminSettingsController.removeLogo)

  return router
}
