import express, { Router } from 'express'
import type { Logger } from 'pino'

import type { PaymentWebhookController } from '../controllers/payment-webhook.controller.js'
import { AppError } from '../utils/app-error.js'
import { WEBHOOK_MAX_BODY_BYTES } from '../payments/webhook-signature.js'

export function createPaymentWebhookRouter(controller: PaymentWebhookController, logger: Logger): Router {
  const router = Router()
  router.use((request, response, next) => {
    const startedAt = performance.now()
    const correlationId = typeof request.id === 'string' ? request.id : undefined
    logger.info({ correlationId, stage: 'entry', status: 'received' }, 'payment_webhook_received')
    response.once('finish', () => {
      logger.info({ correlationId, stage: 'response', status: response.statusCode, durationMs: Math.round(performance.now() - startedAt) }, 'payment_webhook_completed')
    })
    next()
  })
  router.use(express.raw({ limit: WEBHOOK_MAX_BODY_BYTES, type: 'application/json' }))
  router.post('/', controller.receive)
  router.all('/', (_request, _response, next) => {
    next(new AppError(405, 'Método no permitido', 'METHOD_NOT_ALLOWED'))
  })
  return router
}
