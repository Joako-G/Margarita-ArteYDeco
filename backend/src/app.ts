import type { IncomingMessage, ServerResponse } from 'node:http'

import express, { type Express } from 'express'
import type { Logger } from 'pino'

import {
  createApplicationDependencies,
  type IApplicationDependencies,
} from './config/dependencies.js'
import { type IEnv, loadEnv } from './config/env.js'
import { createLogger } from './config/logger.js'
import { createErrorMiddleware, notFoundMiddleware } from './middlewares/error.middleware.js'
import { createRequestLoggerMiddleware } from './middlewares/request-logger.middleware.js'
import { createCorsMiddleware, createHelmetMiddleware } from './middlewares/security.middleware.js'
import { createHealthRouter } from './routes/health.routes.js'
import { createAdminAuthRouter } from './routes/admin-auth.routes.js'
import { createAdminCategoryRouter } from './routes/admin-categories.routes.js'
import { createAdminCustomerRouter } from './routes/admin-customers.routes.js'
import { createAdminDashboardRouter } from './routes/admin-dashboard.routes.js'
import { createAdminOrderRouter } from './routes/admin-orders.routes.js'
import { createAdminProductRouter } from './routes/admin-products.routes.js'
import { createAdminProfileRouter } from './routes/admin-profile.routes.js'
import { createAdminSettingsRouter } from './routes/admin-settings.routes.js'
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
  app.use('/api/admin/customers', createAdminCustomerRouter(dependencies, env))
  app.use('/api/admin/dashboard', createAdminDashboardRouter(dependencies, env))
  app.use('/api/admin/orders', createAdminOrderRouter(dependencies, env))
  app.use('/api/admin/products', createAdminProductRouter(dependencies, env))
  app.use('/api/admin/profile', createAdminProfileRouter(dependencies, env))
  app.use('/api/admin/settings', createAdminSettingsRouter(dependencies, env))
  app.use('/api/orders', createOrderRouter(dependencies, env))
  app.use('/api/public', createPublicRouter(dependencies, env))
  app.use(notFoundMiddleware)
  app.use(createErrorMiddleware(logger))

  return app
}

let runtimeApp: Express | undefined

function getRuntimeApp(): Express {
  if (runtimeApp === undefined) {
    const env = loadEnv()
    const logger = createLogger(env)
    const dependencies = createApplicationDependencies(env, logger)

    runtimeApp = createApp(env, logger, dependencies)
  }

  return runtimeApp
}

export default function handler(
  request: IncomingMessage,
  response: ServerResponse,
): void {
  getRuntimeApp()(request, response)
}
