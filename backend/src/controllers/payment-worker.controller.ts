import type { NextFunction, Request, Response } from 'express'

import type { PaymentWorkerService } from '../services/payment-worker.service.js'
import { AppError } from '../utils/app-error.js'

export class PaymentWorkerController {
  public constructor(
    private readonly worker: PaymentWorkerService,
    private readonly secret: string | null,
  ) {}

  public run = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      if (this.secret === null || request.get('authorization') !== `Bearer ${this.secret}`) {
        throw new AppError(401, 'No autorizado', 'WORKER_UNAUTHORIZED')
      }
      const result = await this.worker.run(request.get('x-worker-id') ?? 'managed-scheduler')
      response.setHeader('Cache-Control', 'no-store')
      response.status(200).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}
