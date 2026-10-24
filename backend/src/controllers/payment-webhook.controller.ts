import type { NextFunction, Request, Response } from 'express'

import type { IPaymentWebhookService } from '../services/payment-webhook.service.js'

export class PaymentWebhookController {
  public constructor(private readonly service: IPaymentWebhookService) {}

  public receive = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.receive({
        correlationId: typeof request.id === 'string' ? request.id : undefined,
        body: Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0),
        requestId: request.get('x-request-id'),
        signature: request.get('x-signature'),
        query: { 'data.id': request.query['data.id'], id: request.query.id, topic: request.query.topic },
      })
      response.setHeader('Cache-Control', 'no-store')
      response.status(200).json({ success: true, data: { acknowledged: true, duplicate: result.duplicate } })
    } catch (error) {
      next(error)
    }
  }
}
