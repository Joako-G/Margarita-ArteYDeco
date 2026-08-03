import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IProductService } from '../services/products.service.js'
import {
  GuestSessionRequiredError,
  type IPublicOrderService,
  RecoveryBlockedError,
} from '../services/public-orders.service.js'
import type { ISettingsService } from '../services/settings.service.js'
import { CSRF_COOKIE_NAME, GUEST_SESSION_COOKIE_NAME } from '../utils/cookies.js'
import { createTestDependencies, TEST_ENV } from './test-helpers.js'

const SESSION_TOKEN = 'A'.repeat(43)
const ORDER_NUMBER = 'MAD-20260802-000001'
const emptyCategoryService: ICategoryService = { listPublic: vi.fn().mockResolvedValue([]) }
const emptyProductService: IProductService = { listPublic: vi.fn().mockResolvedValue([]) }
const emptySettingsService: ISettingsService = {
  getPublic: vi.fn().mockRejectedValue(new Error('Not used')),
}
const confirmation = {
  bankDetails: null,
  createdAt: '2026-08-02T15:00:00.000Z',
  items: [{ lineTotal: 600, name: 'Caja decorada', quantity: 1, unitPrice: 600 }],
  orderNumber: ORDER_NUMBER,
  paymentMethod: 'cash' as const,
  pickup: {
    address: 'Calle 123',
    businessHours: 'Lunes a viernes',
    mapsUrl: 'https://maps.google.com/example',
  },
  status: 'pending' as const,
  totals: { discount: 0, discountPercentage: 0, subtotal: 600, total: 600 },
  whatsappProofUrl: 'https://wa.me/5491100000000?text=pedido',
}

function createPublicOrderService(): IPublicOrderService {
  return {
    forget: vi.fn().mockResolvedValue(undefined),
    getByNumber: vi.fn().mockResolvedValue(confirmation),
    getRecent: vi.fn().mockResolvedValue(confirmation),
    recover: vi.fn().mockResolvedValue({
      captchaRequired: false,
      orderNumber: ORDER_NUMBER,
      sessionExpiresAt: new Date('2026-09-01T15:00:00.000Z'),
      sessionToken: SESSION_TOKEN,
    }),
  }
}

function getApp(publicOrderService: IPublicOrderService): Express {
  return createApp(
    TEST_ENV,
    createLogger(TEST_ENV),
    createTestDependencies(
      emptyCategoryService,
      emptyProductService,
      emptySettingsService,
      undefined,
      publicOrderService,
    ),
  )
}

function getSetCookies(response: request.Response): string[] {
  const value = response.headers['set-cookie']
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

async function getCsrf(app: Express): Promise<string> {
  const response = await request(app).get('/api/public/csrf-token').expect(200)
  return response.body.data.csrfToken as string
}

describe('public order API', () => {
  it('returns only the session-scoped recent confirmation with private cache headers', async () => {
    const service = createPublicOrderService()
    const response = await request(getApp(service))
      .get('/api/public/orders/recent')
      .set('Cookie', `${GUEST_SESSION_COOKIE_NAME}=${SESSION_TOKEN}`)
      .expect(200)

    expect(service.getRecent).toHaveBeenCalledWith(SESSION_TOKEN)
    expect(response.body).toEqual({ success: true, data: confirmation })
    expect(response.body.data).not.toHaveProperty('orderId')
    expect(response.body.data).not.toHaveProperty('customer')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
  })

  it('clears an invalid anonymous cookie without exposing session details', async () => {
    const service = createPublicOrderService()
    vi.mocked(service.getRecent).mockRejectedValue(new GuestSessionRequiredError())
    const response = await request(getApp(service))
      .get('/api/public/orders/recent')
      .set('Cookie', `${GUEST_SESSION_COOKIE_NAME}=invalid`)
      .expect(401)
    const clearedCookie = getSetCookies(response)
      .find((cookie) => cookie.startsWith(`${GUEST_SESSION_COOKIE_NAME}=`)) ?? ''

    expect(response.body).toMatchObject({
      error: 'GUEST_SESSION_REQUIRED',
      success: false,
    })
    expect(clearedCookie).toContain('HttpOnly')
    expect(clearedCookie).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/)
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('requires allowed Origin and double-submit CSRF for recovery', async () => {
    const service = createPublicOrderService()
    const app = getApp(service)
    const csrfToken = await getCsrf(app)

    await request(app)
      .post('/api/public/orders/recover')
      .set('Cookie', `${CSRF_COOKIE_NAME}=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ orderNumber: ORDER_NUMBER, phone: '+54 9 11 2345-6789' })
      .expect(403)

    expect(service.recover).not.toHaveBeenCalled()
  })

  it('emits a recovered credential only as an HttpOnly cookie', async () => {
    const service = createPublicOrderService()
    const app = getApp(service)
    const csrfToken = await getCsrf(app)
    const response = await request(app)
      .post('/api/public/orders/recover')
      .set('Origin', TEST_ENV.corsAllowedOrigins[0] ?? '')
      .set('Cookie', `${CSRF_COOKIE_NAME}=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        orderNumber: ORDER_NUMBER,
        phone: '+54 9 11 2345-6789',
        turnstileToken: 'challenge-token',
      })
      .expect(200)
    const sessionCookie = getSetCookies(response)
      .find((cookie) => cookie.startsWith(`${GUEST_SESSION_COOKIE_NAME}=`)) ?? ''

    expect(response.body).toEqual({
      success: true,
      data: { orderNumber: ORDER_NUMBER, recovered: true },
    })
    expect(JSON.stringify(response.body)).not.toContain(SESSION_TOKEN)
    expect(sessionCookie).toContain(`${GUEST_SESSION_COOKIE_NAME}=${SESSION_TOKEN}`)
    expect(sessionCookie).toContain('HttpOnly')
    expect(sessionCookie).toContain('Secure')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(service.recover).toHaveBeenCalledWith(
      expect.objectContaining({ turnstileToken: 'challenge-token' }),
      null,
      expect.any(String),
    )
  })

  it('returns Retry-After when recovery is temporarily blocked', async () => {
    const service = createPublicOrderService()
    vi.mocked(service.recover).mockRejectedValue(new RecoveryBlockedError(600))
    const app = getApp(service)
    const csrfToken = await getCsrf(app)
    const response = await request(app)
      .post('/api/public/orders/recover')
      .set('Origin', TEST_ENV.corsAllowedOrigins[0] ?? '')
      .set('Cookie', `${CSRF_COOKIE_NAME}=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ orderNumber: ORDER_NUMBER, phone: '+54 9 11 2345-6789' })
      .expect(429)

    expect(response.headers['retry-after']).toBe('600')
    expect(response.body).toMatchObject({
      error: 'ORDER_RECOVERY_BLOCKED',
      retryAfterSeconds: 600,
    })
  })

  it('revokes and clears the session credential with CSRF protection', async () => {
    const service = createPublicOrderService()
    const app = getApp(service)
    const csrfToken = await getCsrf(app)
    const response = await request(app)
      .delete('/api/public/guest-session')
      .set('Origin', TEST_ENV.corsAllowedOrigins[0] ?? '')
      .set(
        'Cookie',
        `${CSRF_COOKIE_NAME}=${csrfToken}; ${GUEST_SESSION_COOKIE_NAME}=${SESSION_TOKEN}`,
      )
      .set('X-CSRF-Token', csrfToken)
      .expect(200)

    expect(service.forget).toHaveBeenCalledWith(SESSION_TOKEN)
    expect(response.body).toEqual({ success: true, data: { forgotten: true } })
    expect(getSetCookies(response).some((cookie) => (
      cookie.startsWith(`${GUEST_SESSION_COOKIE_NAME}=`)
      && /Expires=Thu, 01 Jan 1970|Max-Age=0/.test(cookie)
    ))).toBe(true)
  })
})
