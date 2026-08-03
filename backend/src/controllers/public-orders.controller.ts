import type { NextFunction, Request, Response } from 'express'

import {
  publicOrderParamsSchema,
  recoverOrderBodySchema,
} from '../schemas/orders.schema.js'
import {
  GuestSessionRequiredError,
  type IPublicOrderService,
  RecoveryBlockedError,
} from '../services/public-orders.service.js'
import {
  clearGuestSessionCookie,
  GUEST_SESSION_COOKIE_NAME,
  parseCookieValue,
  setGuestSessionCookie,
} from '../utils/cookies.js'

export class PublicOrderController {
  public constructor(private readonly service: IPublicOrderService) {}

  public forget = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.service.forget(this.getSessionToken(request))
      clearGuestSessionCookie(response)
      this.setPrivateHeaders(response)
      response.status(200).json({ success: true, data: { forgotten: true } })
    } catch (error) {
      this.setPrivateHeaders(response)
      next(error)
    }
  }

  public getByNumber = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const params = publicOrderParamsSchema.parse(request.params)
      const confirmation = await this.service.getByNumber(
        params.orderNumber,
        this.getSessionToken(request),
      )

      this.setPrivateHeaders(response)
      response.status(200).json({ success: true, data: confirmation })
    } catch (error) {
      this.handleSessionError(error, response)
      this.setPrivateHeaders(response)
      next(error)
    }
  }

  public getRecent = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const confirmation = await this.service.getRecent(this.getSessionToken(request))

      this.setPrivateHeaders(response)
      response.status(200).json({ success: true, data: confirmation })
    } catch (error) {
      this.handleSessionError(error, response)
      this.setPrivateHeaders(response)
      next(error)
    }
  }

  public recover = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = recoverOrderBodySchema.parse(request.body)
      const result = await this.service.recover(
        body,
        this.getSessionToken(request),
        request.ip ?? request.socket.remoteAddress ?? 'unknown',
      )

      setGuestSessionCookie(response, result.sessionToken, result.sessionExpiresAt)
      this.setPrivateHeaders(response)
      response.status(200).json({
        success: true,
        data: {
          orderNumber: result.orderNumber,
          recovered: true,
        },
      })
    } catch (error) {
      this.setPrivateHeaders(response)
      if (error instanceof RecoveryBlockedError) {
        response.setHeader('Retry-After', error.retryAfterSeconds)
      }

      next(error)
    }
  }

  private getSessionToken(request: Request): string | null {
    return parseCookieValue(request.get('cookie'), GUEST_SESSION_COOKIE_NAME)
  }

  private handleSessionError(error: unknown, response: Response): void {
    if (error instanceof GuestSessionRequiredError) {
      clearGuestSessionCookie(response)
    }
  }

  private setPrivateHeaders(response: Response): void {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
  }
}
