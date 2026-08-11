import { Router } from 'express'

import type { CategoryController } from '../controllers/categories.controller.js'
import type { CsrfController } from '../controllers/csrf.controller.js'
import type { ProductController } from '../controllers/products.controller.js'
import type { PublicOrderController } from '../controllers/public-orders.controller.js'
import type { SettingsController } from '../controllers/settings.controller.js'
import type { SitemapController } from '../controllers/sitemap.controller.js'
import type { IEnv } from '../config/env.js'
import {
  createCsrfValidationMiddleware,
  createOriginValidationMiddleware,
  createPublicRateLimitMiddleware,
} from '../middlewares/security.middleware.js'
import { validateBody, validateParams } from '../middlewares/validation.middleware.js'
import { publicOrderParamsSchema, recoverOrderBodySchema } from '../schemas/orders.schema.js'
import type { ICsrfService } from '../services/csrf.service.js'

export interface IPublicRouteControllers {
  categoryController: CategoryController
  csrfController: CsrfController
  csrfService: ICsrfService
  productController: ProductController
  publicOrderController: PublicOrderController
  settingsController: SettingsController
  sitemapController: SitemapController
}

export function createPublicRouter(
  controllers: IPublicRouteControllers,
  env: Pick<
    IEnv,
    'corsAllowedOrigins' | 'publicRateLimitMax' | 'publicRateLimitWindowMs' | 'redisUrl'
  >,
): Router {
  const router = Router()

  router.use(createPublicRateLimitMiddleware(env))
  router.get('/categories', controllers.categoryController.listPublic)
  router.get('/csrf-token', controllers.csrfController.getToken)
  router.get('/products', controllers.productController.listPublic)
  router.get('/settings', controllers.settingsController.getPublic)
  router.get('/sitemap.xml', controllers.sitemapController.get)
  router.get('/orders/recent', controllers.publicOrderController.getRecent)
  router.get(
    '/orders/:orderNumber',
    validateParams(publicOrderParamsSchema),
    controllers.publicOrderController.getByNumber,
  )
  router.post(
    '/orders/recover',
    createOriginValidationMiddleware(env.corsAllowedOrigins),
    createCsrfValidationMiddleware(controllers.csrfService),
    validateBody(recoverOrderBodySchema),
    controllers.publicOrderController.recover,
  )
  router.delete(
    '/guest-session',
    createOriginValidationMiddleware(env.corsAllowedOrigins),
    createCsrfValidationMiddleware(controllers.csrfService),
    controllers.publicOrderController.forget,
  )

  return router
}
