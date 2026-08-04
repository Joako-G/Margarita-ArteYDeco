import type { NextFunction, Request, RequestHandler, Response } from 'express'

import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminProfile } from '../types/admin-auth.js'
import type { IAdminSessionTokens } from '../types/admin-auth.js'
import { AppError } from '../utils/app-error.js'
import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_NAME,
  clearAdminSessionCookies,
  parseCookieValue,
  setAdminSessionCookies,
} from '../utils/cookies.js'

const adminProfiles = new WeakMap<Request, IAdminProfile>()
const adminTokens = new WeakMap<Request, Pick<IAdminSessionTokens, 'accessToken' | 'refreshToken'>>()

export function getAuthenticatedAdmin(request: Request): IAdminProfile {
  const profile = adminProfiles.get(request)

  if (profile === undefined) {
    throw new Error('Administrative authentication middleware was not executed')
  }

  return profile
}

export function getAuthenticatedAdminTokens(
  request: Request,
): Pick<IAdminSessionTokens, 'accessToken' | 'refreshToken'> {
  const tokens = adminTokens.get(request)

  if (tokens === undefined) {
    throw new AppError(401, 'Tu sesión no es válida o venció', 'ADMIN_SESSION_REQUIRED')
  }

  return tokens
}

export function createAdminAuthenticationMiddleware(
  service: IAdminAuthService,
  sessionMaxAgeMs: number,
): RequestHandler {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const accessToken = parseCookieValue(request.get('cookie'), ADMIN_ACCESS_COOKIE_NAME)
      const refreshToken = parseCookieValue(request.get('cookie'), ADMIN_REFRESH_COOKIE_NAME)
      const session = await service.authenticate(accessToken, refreshToken)

      if (session.tokensToSet !== null) {
        setAdminSessionCookies(
          response,
          session.tokensToSet.accessToken,
          session.tokensToSet.expiresAt,
          session.tokensToSet.refreshToken,
          sessionMaxAgeMs,
        )
      }

      adminProfiles.set(request, session.profile)
      const effectiveAccessToken = session.tokensToSet?.accessToken ?? accessToken
      const effectiveRefreshToken = session.tokensToSet?.refreshToken ?? refreshToken

      if (effectiveAccessToken !== null && effectiveRefreshToken !== null) {
        adminTokens.set(request, {
          accessToken: effectiveAccessToken,
          refreshToken: effectiveRefreshToken,
        })
      }
      next()
    } catch (error) {
      clearAdminSessionCookies(response)
      next(error)
    }
  }
}

export const requireAdministratorRole: RequestHandler = (request, _response, next) => {
  const profile = adminProfiles.get(request)

  if (profile === undefined || profile.role !== 'administrator' || !profile.isActive) {
    next(new AppError(403, 'No tenés permiso para acceder', 'ADMIN_ACCESS_FORBIDDEN'))
    return
  }

  next()
}

export const setAdminPrivateHeaders: RequestHandler = (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Referrer-Policy', 'no-referrer')
  next()
}
