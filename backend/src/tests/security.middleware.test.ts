import express, { type Express } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createLogger } from '../config/logger.js'
import {
  createAdminLoginRateLimitMiddleware,
  createCorsMiddleware,
  createCsrfValidationMiddleware,
  createOrderRateLimitMiddleware,
  createOriginValidationMiddleware,
  createPublicRateLimitMiddleware,
} from '../middlewares/security.middleware.js'
import { createErrorMiddleware } from '../middlewares/error.middleware.js'
import { CsrfService } from '../services/csrf.service.js'
import { CSRF_COOKIE_NAME, setCsrfCookie } from '../utils/cookies.js'
import { TEST_ADMIN_ORIGIN, TEST_ENV } from './test-helpers.js'

const ALLOWED_ORIGIN = TEST_ADMIN_ORIGIN
const FORBIDDEN_ORIGIN = 'https://attacker.example'

function buildRateLimitApp(
  middleware: ReturnType<typeof createPublicRateLimitMiddleware>,
  successStatus = 200,
): Express {
  const app = express()
  app.use(middleware)
  app.get('/', (_request, response) => {
    response.status(successStatus).json({ ok: true })
  })
  app.use(createErrorMiddleware(createLogger(TEST_ENV)))
  return app
}

function buildOriginApp(middleware: ReturnType<typeof createOriginValidationMiddleware>): Express {
  const app = express()
  app.use(middleware)
  app.get('/', (_request, response) => {
    response.json({ ok: true })
  })
  app.use(createErrorMiddleware(createLogger(TEST_ENV)))
  return app
}

describe('createPublicRateLimitMiddleware', () => {
  it('accepts requests under the window and blocks beyond the limit', async () => {
    const app = buildRateLimitApp(createPublicRateLimitMiddleware(TEST_ENV))

    for (let i = 0; i < TEST_ENV.publicRateLimitMax; i += 1) {
      await request(app).get('/').expect(200)
    }

    const blocked = await request(app).get('/').expect(429)

    expect(blocked.body).toEqual({
      success: false,
      message: 'Demasiadas solicitudes. Intentá nuevamente más tarde',
      error: 'RATE_LIMIT_EXCEEDED',
    })
    expect(blocked.headers['ratelimit']).toBeDefined()
    expect(blocked.headers['retry-after']).toBeDefined()
  })
})

describe('createOrderRateLimitMiddleware', () => {
  it('blocks order creation attempts beyond the configured window', async () => {
    const app = buildRateLimitApp(createOrderRateLimitMiddleware(TEST_ENV))

    for (let i = 0; i < TEST_ENV.orderRateLimitMax; i += 1) {
      await request(app).get('/').expect(200)
    }

    const blocked = await request(app).get('/').expect(429)

    expect(blocked.body).toMatchObject({ error: 'ORDER_RATE_LIMIT_EXCEEDED' })
  })
})

describe('createAdminLoginRateLimitMiddleware', () => {
  it('throttles failed login attempts with a distinct code', async () => {
    const app = buildRateLimitApp(
      createAdminLoginRateLimitMiddleware(TEST_ENV),
      401,
    )

    for (let i = 0; i < TEST_ENV.adminLoginRateLimitMax; i += 1) {
      await request(app).get('/').expect(401)
    }

    const blocked = await request(app).get('/').expect(429)

    expect(blocked.body).toMatchObject({ error: 'ADMIN_LOGIN_RATE_LIMIT_EXCEEDED' })
  })
})

describe('createCorsMiddleware', () => {
  it('allows only explicit origins with credentials', async () => {
    const app = buildOriginApp(createCorsMiddleware(TEST_ENV.corsAllowedOrigins))

    const allowed = await request(app).get('/').set('Origin', ALLOWED_ORIGIN).expect(200)

    expect(allowed.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN)
    expect(allowed.headers['access-control-allow-credentials']).toBe('true')
  })

  it('allows PATCH preflight requests used by publication controls', async () => {
    const app = buildOriginApp(createCorsMiddleware(TEST_ENV.corsAllowedOrigins))

    const response = await request(app)
      .options('/')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'PATCH')
      .expect(204)

    expect(response.headers['access-control-allow-methods']).toContain('PATCH')
  })

  it('rejects disallowed origins with the canonical error', async () => {
    const app = buildOriginApp(createCorsMiddleware(TEST_ENV.corsAllowedOrigins))

    const rejected = await request(app).get('/').set('Origin', FORBIDDEN_ORIGIN).expect(403)

    expect(rejected.body).toEqual({
      success: false,
      message: 'Origen no permitido',
      error: 'ORIGIN_NOT_ALLOWED',
    })
  })
})

describe('createOriginValidationMiddleware', () => {
  it('rejects requests without an Origin header', async () => {
    const app = buildOriginApp(createOriginValidationMiddleware(TEST_ENV.corsAllowedOrigins))

    const rejected = await request(app).get('/').expect(403)

    expect(rejected.body).toMatchObject({ error: 'ORIGIN_NOT_ALLOWED' })
  })

  it('rejects browser origins outside the allowlist', async () => {
    const app = buildOriginApp(createOriginValidationMiddleware(TEST_ENV.corsAllowedOrigins))

    const rejected = await request(app).get('/').set('Origin', FORBIDDEN_ORIGIN).expect(403)

    expect(rejected.body).toMatchObject({ error: 'ORIGIN_NOT_ALLOWED' })
  })

  it('accepts requests from an allowlisted origin', async () => {
    const app = buildOriginApp(createOriginValidationMiddleware(TEST_ENV.corsAllowedOrigins))

    await request(app).get('/').set('Origin', ALLOWED_ORIGIN).expect(200)
  })
})

describe('createCsrfValidationMiddleware', () => {
  function buildCsrfApp(): Express {
    const csrfService = new CsrfService(TEST_ENV.securityHmacSecret)
    const app = express()
    app.get('/csrf', (request, response) => {
      const token = csrfService.createToken()
      setCsrfCookie(response, token)
      response.json({ token })
    })
    app.post('/protected', createCsrfValidationMiddleware(csrfService), (_request, response) => {
      response.json({ success: true })
    })
    app.use(createErrorMiddleware(createLogger(TEST_ENV)))
    return app
  }

  it('rejects mutations without a valid header/cookie pair', async () => {
    const app = buildCsrfApp()

    const rejected = await request(app).post('/protected').expect(403)

    expect(rejected.body).toEqual({
      success: false,
      message: 'Token CSRF inválido',
      error: 'INVALID_CSRF_TOKEN',
    })
  })

  it('accepts mutations presenting the matching header and cookie', async () => {
    const app = buildCsrfApp()
    const csrfResponse = await request(app).get('/csrf').expect(200)
    const token = csrfResponse.body.token as string
    const setCookieHeaders = csrfResponse.headers['set-cookie'] as string | string[] | undefined
    const setCookieList = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders]
    const cookie = setCookieList
      .filter((value: string | undefined): value is string => typeof value === 'string')
      .find((value: string) => value.startsWith(`${CSRF_COOKIE_NAME}=`))
      ?.split(';')[0]

    const accepted = await request(app)
      .post('/protected')
      .set('Cookie', cookie ?? '')
      .set('X-CSRF-Token', token)
      .expect(200)

    expect(accepted.body).toEqual({ success: true })
  })
})
