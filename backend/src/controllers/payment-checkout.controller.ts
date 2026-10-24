import type { NextFunction, Request, Response } from 'express'

import type {
  IPaymentCheckoutService,
  PaymentCheckoutRequest,
} from '../services/payment-checkout.service.js'
import { GUEST_SESSION_COOKIE_NAME, parseCookieValue, setGuestSessionCookie } from '../utils/cookies.js'

export class PaymentCheckoutController {
  public constructor(private readonly service: IPaymentCheckoutService) {}

  public create = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.create(
        response.locals.validatedBody as PaymentCheckoutRequest,
        parseCookieValue(request.get('cookie'), GUEST_SESSION_COOKIE_NAME),
        response.locals.idempotencyKey as string,
      )
      if (result.sessionTokenToSet !== null) {
        setGuestSessionCookie(response, result.sessionTokenToSet, result.sessionExpiresAt)
      }
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('Referrer-Policy', 'no-referrer')
      response.status(201).json({
        success: true,
        data: {
          checkoutUrl: result.checkoutUrl,
          orderNumber: result.orderNumber,
          reservationExpiresAt: result.reservationExpiresAt.toISOString(),
        },
      })
    } catch (error) {
      next(error)
    }
  }

  public resume = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderNumber } = response.locals.validatedParams as { orderNumber: string }
      const result = await this.service.resume(
        orderNumber,
        parseCookieValue(request.get('cookie'), GUEST_SESSION_COOKIE_NAME),
      )
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('Referrer-Policy', 'no-referrer')
      response.status(200).json({
        success: true,
        data: {
          checkoutUrl: result.checkoutUrl,
          orderNumber: result.orderNumber,
          reservationExpiresAt: result.reservationExpiresAt.toISOString(),
        },
      })
    } catch (error) {
      next(error)
    }
  }

  public getStatus = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderNumber } = response.locals.validatedParams as { orderNumber: string }
      const result = await this.service.getStatus(
        orderNumber,
        parseCookieValue(request.get('cookie'), GUEST_SESSION_COOKIE_NAME),
      )
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('Referrer-Policy', 'no-referrer')
      response.status(200).json({ success: true, data: { ...result, reservationExpiresAt: result.reservationExpiresAt.toISOString() } })
    } catch (error) {
      next(error)
    }
  }
}
