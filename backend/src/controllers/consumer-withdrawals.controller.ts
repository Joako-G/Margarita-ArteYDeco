import type { NextFunction, Request, Response } from 'express'

import type { IConsumerWithdrawalService } from '../services/consumer-withdrawals.service.js'
import { ConsumerWithdrawalBlockedError } from '../services/consumer-withdrawals.service.js'
import { AppError } from '../utils/app-error.js'

export class ConsumerWithdrawalController {
  public constructor(private readonly service: IConsumerWithdrawalService) {}

  public create = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    this.setPrivateHeaders(response)
    try {
      if (request.ip === undefined) {
        throw new AppError(500, 'No se pudo determinar la IP del cliente', 'CLIENT_IP_UNAVAILABLE')
      }
      const body = response.locals.validatedBody as Parameters<IConsumerWithdrawalService['create']>[0]
      const idempotencyKey = response.locals.idempotencyKey as string
      response.status(201).json({
        success: true,
        data: await this.service.create(body, idempotencyKey, request.ip),
      })
    } catch (error) {
      if (error instanceof ConsumerWithdrawalBlockedError) {
        response.setHeader('Retry-After', error.retryAfterSeconds)
      }
      next(error)
    }
  }

  public getStatus = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    this.setPrivateHeaders(response)
    try {
      const body = response.locals.validatedBody as { captchaToken?: string; requestCode: string }
      response.status(200).json({
        success: true,
        data: await this.service.getStatus(body.requestCode, body.captchaToken, request.ip),
      })
    } catch (error) {
      next(error)
    }
  }

  private setPrivateHeaders(response: Response): void {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
  }
}
