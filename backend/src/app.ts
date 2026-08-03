import express, { type Express } from 'express'
import type { Logger } from 'pino'

import type { IApplicationDependencies } from './config/dependencies.js'
import type { IEnv } from './config/env.js'
import { createErrorMiddleware, notFoundMiddleware } from './middlewares/error.middleware.js'
import { createRequestLoggerMiddleware } from './middlewares/request-logger.middleware.js'
import { createCorsMiddleware, createHelmetMiddleware } from './middlewares/security.middleware.js'
import { createHealthRouter } from './routes/health.routes.js'
import { createAdminAuthRouter } from './routes/admin-auth.routes.js'
import { createAdminCategoryRouter } from './routes/admin-categories.routes.js'
import { createAdminDashboardRouter } from './routes/admin-dashboard.routes.js'
import { createAdminOrderRouter } from './routes/admin-orders.routes.js'
import { createAdminProductRouter } from './routes/admin-products.routes.js'
import { createOrderRouter } from './routes/orders.routes.js'
import { createPublicRouter } from './routes/public.routes.js'

export function createApp(
  env: IEnv,
  logger: Logger,
  dependencies: IApplicationDependencies,
): Express {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', env.trustProxy ? 1 : false)
  app.use(createRequestLoggerMiddleware(logger))
  app.use(createHelmetMiddleware())
  app.use(createCorsMiddleware(env.corsAllowedOrigins))
  app.use(express.json({ limit: '32kb', strict: true }))
  app.use('/api', createHealthRouter())
  app.use('/api/admin/auth', createAdminAuthRouter(dependencies, env))
  app.use('/api/admin/categories', createAdminCategoryRouter(dependencies, env))
  app.use('/api/admin/dashboard', createAdminDashboardRouter(dependencies, env))
  app.use('/api/admin/orders', createAdminOrderRouter(dependencies, env))
  app.use('/api/admin/products', createAdminProductRouter(dependencies, env))
  app.use('/api/orders', createOrderRouter(dependencies, env))
  app.use('/api/public', createPublicRouter(dependencies, env))
  app.use(notFoundMiddleware)
  app.use(createErrorMiddleware(logger))

  return app
}
