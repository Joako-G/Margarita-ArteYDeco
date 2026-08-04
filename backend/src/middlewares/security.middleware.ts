import { createRequire } from 'node:module'

import cors, { type CorsOptions } from 'cors'
import type { RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import type { HelmetOptions } from 'helmet'

import type { IEnv } from '../config/env.js'
import type { ICsrfService } from '../services/csrf.service.js'
import { AppError } from '../utils/app-error.js'
import { CSRF_COOKIE_NAME, parseCookieValue } from '../utils/cookies.js'

type HelmetFactory = (options?: Readonly<HelmetOptions>) => RequestHandler

const helmet = createRequire(import.meta.url)('helmet') as HelmetFactory

export function createHelmetMiddleware(): RequestHandler {
  return helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
}

export function createCorsMiddleware(allowedOrigins: readonly string[]): RequestHandler {
  const allowedOriginSet = new Set(allowedOrigins)
  const options: CorsOptions = {
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    credentials: true,
    methods: ['DELETE', 'GET', 'OPTIONS', 'POST', 'PUT'],
    origin: (origin, callback) => {
      if (origin === undefined || allowedOriginSet.has(origin)) {
        callback(null, true)
        return
      }

      callback(new AppError(403, 'Origen no permitido', 'ORIGIN_NOT_ALLOWED'))
    },
  }

  return cors(options)
}

export function createPublicRateLimitMiddleware(
  env: Pick<IEnv, 'publicRateLimitMax' | 'publicRateLimitWindowMs'>,
): RequestHandler {
  return rateLimit({
    handler: (_request, response) => {
      response.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intentá nuevamente más tarde',
        error: 'RATE_LIMIT_EXCEEDED',
      })
    },
    legacyHeaders: false,
    limit: env.publicRateLimitMax,
    standardHeaders: 'draft-8',
    windowMs: env.publicRateLimitWindowMs,
  })
}

export function createOrderRateLimitMiddleware(
  env: Pick<IEnv, 'orderRateLimitMax' | 'orderRateLimitWindowMs'>,
): RequestHandler {
  return rateLimit({
    handler: (_request, response) => {
      response.status(429).json({
        success: false,
        message: 'Demasiados intentos de crear pedidos. Intentá nuevamente más tarde',
        error: 'ORDER_RATE_LIMIT_EXCEEDED',
      })
    },
    legacyHeaders: false,
    limit: env.orderRateLimitMax,
    standardHeaders: 'draft-8',
    windowMs: env.orderRateLimitWindowMs,
  })
}

export function createAdminLoginRateLimitMiddleware(
  env: Pick<IEnv, 'adminLoginRateLimitMax' | 'adminLoginRateLimitWindowMs'>,
): RequestHandler {
  return rateLimit({
    handler: (_request, response) => {
      response.status(429).json({
        success: false,
        message: 'Demasiados intentos de ingreso. Intentá nuevamente más tarde',
        error: 'ADMIN_LOGIN_RATE_LIMIT_EXCEEDED',
      })
    },
    legacyHeaders: false,
    limit: env.adminLoginRateLimitMax,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    windowMs: env.adminLoginRateLimitWindowMs,
  })
}

export function createOriginValidationMiddleware(
  allowedOrigins: readonly string[],
): RequestHandler {
  const allowedOriginSet = new Set(allowedOrigins)

  return (request, _response, next): void => {
    const origin = request.get('origin')

    if (origin === undefined || !allowedOriginSet.has(origin)) {
      next(new AppError(403, 'Origen no permitido', 'ORIGIN_NOT_ALLOWED'))
      return
    }

    next()
  }
}

export function createCsrfValidationMiddleware(csrfService: ICsrfService): RequestHandler {
  return (request, _response, next): void => {
    const headerToken = request.get('x-csrf-token')
    const cookieToken = parseCookieValue(request.get('cookie'), CSRF_COOKIE_NAME)

    if (
      headerToken === undefined ||
      cookieToken === null ||
      headerToken !== cookieToken ||
      !csrfService.verifyToken(headerToken)
    ) {
      next(new AppError(403, 'Token CSRF inválido', 'INVALID_CSRF_TOKEN'))
      return
    }

    next()
  }
}
