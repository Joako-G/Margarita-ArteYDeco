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

export function createAdminProductRouter(
  dependencies: Pick<
    IApplicationDependencies,
    'adminAuthService' | 'adminInventoryController' | 'adminProductController' | 'csrfService'
  >,
  env: Pick<IEnv, 'adminSessionMaxAgeMs' | 'adminOperationRateLimitMax' | 'adminOperationRateLimitWindowMs' | 'corsAllowedOrigins' | 'redisUrl'>,
): Router {
  const router = Router()
  const authenticate = createAdminAuthenticationMiddleware(
    dependencies.adminAuthService,
    env.adminSessionMaxAgeMs,
  )
  const verifyOrigin = createOriginValidationMiddleware(env.corsAllowedOrigins)
  const verifyCsrf = createCsrfValidationMiddleware(dependencies.csrfService)
  const protectWrite = [verifyOrigin, verifyCsrf]

  router.use(setAdminPrivateHeaders)
  router.use(authenticate, requireAdministratorRole, createAdminOperationRateLimitMiddleware(env))
  router.get('/', dependencies.adminProductController.list)
  router.get('/form-options', dependencies.adminProductController.getCategoryOptions)
  router.post('/', ...protectWrite, dependencies.adminProductController.create)
  router.get('/:productId/inventory', dependencies.adminInventoryController.getHistory)
  router.post(
    '/:productId/inventory-adjustments',
    ...protectWrite,
    dependencies.adminInventoryController.adjustStock,
  )
  router.get('/:productId', dependencies.adminProductController.getById)
  router.put('/:productId', ...protectWrite, dependencies.adminProductController.update)
  router.patch(
    '/:productId/publication',
    ...protectWrite,
    dependencies.adminProductController.setPublication,
  )
  router.patch(
    '/:productId/featured',
    ...protectWrite,
    dependencies.adminProductController.setFeatured,
  )
  router.put(
    '/:productId/image',
    ...protectWrite,
    raw({
      limit: PRODUCT_IMAGE_MAX_BYTES,
      type: ['image/jpeg', 'image/png', 'image/webp'],
    }),
    dependencies.adminProductController.replaceImage,
  )
  router.delete('/:productId/image', ...protectWrite, dependencies.adminProductController.removeImage)
  router.delete('/:productId', ...protectWrite, dependencies.adminProductController.softDelete)

  return router
}
