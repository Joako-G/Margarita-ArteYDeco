import { createApp } from './app.js'
import { createApplicationDependencies } from './config/dependencies.js'
import { loadEnv } from './config/env.js'
import { createLogger } from './config/logger.js'

const env = loadEnv()
const logger = createLogger(env)
const dependencies = createApplicationDependencies(env, logger)
const app = createApp(env, logger, dependencies)

const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, 'API iniciada')
})

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Cierre controlado iniciado')

  server.close((error) => {
    if (error !== undefined) {
      logger.error({ error }, 'No fue posible cerrar el servidor correctamente')
      process.exitCode = 1
      return
    }

    logger.info('API detenida')
  })
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
