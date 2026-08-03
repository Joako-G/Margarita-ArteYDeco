import type { NextFunction, Request, Response } from 'express'

import { getAuthenticatedAdmin } from '../middlewares/admin-auth.middleware.js'
import { adminLoginSchema } from '../schemas/admin-auth.schema.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminProfile } from '../types/admin-auth.js'
import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_NAME,
  clearAdminSessionCookies,
  parseCookieValue,
  setAdminSessionCookies,
} from '../utils/cookies.js'

function toPublicProfile(
  profile: IAdminProfile,
): Omit<IAdminProfile, 'id' | 'isActive'> {
  return {
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
  }
}

export class AdminAuthController {
  public constructor(
    private readonly service: IAdminAuthService,
    private readonly sessionMaxAgeMs: number,
  ) {}

  public login = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const session = await this.service.login(adminLoginSchema.parse(request.body))

      setAdminSessionCookies(
        response,
        session.tokens.accessToken,
        session.tokens.expiresAt,
        session.tokens.refreshToken,
        this.sessionMaxAgeMs,
      )
      response.status(200).json({
        success: true,
        data: { authenticated: true, profile: toPublicProfile(session.profile) },
      })
    } catch (error) {
      clearAdminSessionCookies(response)
      next(error)
    }
  }

  public logout = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.service.logout(
        parseCookieValue(request.get('cookie'), ADMIN_ACCESS_COOKIE_NAME),
        parseCookieValue(request.get('cookie'), ADMIN_REFRESH_COOKIE_NAME),
      )
      clearAdminSessionCookies(response)
      response.status(200).json({ success: true, data: { authenticated: false } })
    } catch (error) {
      clearAdminSessionCookies(response)
      next(error)
    }
  }

  public getSession = (request: Request, response: Response): void => {
    response.status(200).json({
      success: true,
      data: { authenticated: true, profile: toPublicProfile(getAuthenticatedAdmin(request)) },
    })
  }

  public getProfile = (request: Request, response: Response): void => {
    response.status(200).json({
      success: true,
      data: toPublicProfile(getAuthenticatedAdmin(request)),
    })
  }
}
