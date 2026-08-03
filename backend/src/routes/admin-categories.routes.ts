import { raw, Router } from 'express'

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
import { PRODUCT_IMAGE_MAX_BYTES } from '../utils/product-image.js'

export function createAdminCategoryRouter(
  dependencies: Pick<
    IApplicationDependencies,
    'adminAuthService' | 'adminCategoryController' | 'csrfService'
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
  router.get('/', dependencies.adminCategoryController.list)
  router.post('/', ...protectWrite, dependencies.adminCategoryController.create)
  router.get('/:categoryId', dependencies.adminCategoryController.getById)
  router.put('/:categoryId', ...protectWrite, dependencies.adminCategoryController.update)
  router.patch(
    '/:categoryId/publication',
    ...protectWrite,
    dependencies.adminCategoryController.setPublication,
  )
  router.put(
    '/:categoryId/image',
    ...protectWrite,
    raw({
      limit: PRODUCT_IMAGE_MAX_BYTES,
      type: ['image/jpeg', 'image/png', 'image/webp'],
    }),
    dependencies.adminCategoryController.replaceImage,
  )
  router.delete('/:categoryId', ...protectWrite, dependencies.adminCategoryController.softDelete)

  return router
}
