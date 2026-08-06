import type { NextFunction, Request, Response } from 'express'

import {
  type IOrderService,
  OrderConfirmationUnavailableError,
} from '../services/orders.service.js'
import {
  GUEST_SESSION_COOKIE_NAME,
  parseCookieValue,
  setGuestSessionCookie,
} from '../utils/cookies.js'

export class OrderController {
  public constructor(private readonly service: IOrderService) {}

  public create = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = response.locals.validatedBody as Parameters<IOrderService['create']>[0]
      const idempotencyKey = response.locals.idempotencyKey as string
      const sessionToken = parseCookieValue(
        request.get('cookie'),
        GUEST_SESSION_COOKIE_NAME,
      )
      const result = await this.service.create(body, sessionToken, idempotencyKey)

      if (result.sessionTokenToSet !== null) {
        setGuestSessionCookie(
          response,
          result.sessionTokenToSet,
          result.sessionExpiresAt,
        )
      }

      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('Referrer-Policy', 'no-referrer')
      response.status(201).json({ success: true, data: result.confirmation })
    } catch (error) {
      if (
        error instanceof OrderConfirmationUnavailableError &&
        error.session.tokenToSet !== null
      ) {
        setGuestSessionCookie(
          response,
          error.session.tokenToSet,
          error.session.expiresAt,
        )
      }

      next(error)
    }
  }
}
