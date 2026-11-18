import { Router } from 'express'

import type { PaymentReturnController } from '../controllers/payment-return.controller.js'
import { AppError } from '../utils/app-error.js'

export function createPaymentReturnRouter(controller: PaymentReturnController): Router {
  const router = Router()
  router.get('/:orderNumber', controller.redirect)
  router.all('/:orderNumber', (_request, _response, next) => {
    next(new AppError(405, 'Método no permitido', 'METHOD_NOT_ALLOWED'))
  })
  return router
}
