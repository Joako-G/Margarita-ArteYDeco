import { Router } from 'express'

import type { PaymentWorkerController } from '../controllers/payment-worker.controller.js'
import { AppError } from '../utils/app-error.js'

export function createPaymentWorkerRouter(controller: PaymentWorkerController): Router {
  const router = Router()
  router.post('/', controller.run)
  router.all('/', (_request, _response, next) => next(new AppError(405, 'Método no permitido', 'METHOD_NOT_ALLOWED')))
  return router
}
