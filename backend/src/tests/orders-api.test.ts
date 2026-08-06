import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IOrderService } from '../services/orders.service.js'
import type { IProductService } from '../services/products.service.js'
import type { ISettingsService } from '../services/settings.service.js'
import { CSRF_COOKIE_NAME, GUEST_SESSION_COOKIE_NAME } from '../utils/cookies.js'
import { createTestDependencies, TEST_ENV } from './test-helpers.js'

const emptyCategoryService: ICategoryService = { listPublic: vi.fn().mockResolvedValue([]) }
const emptyProductService: IProductService = { listPublic: vi.fn().mockResolvedValue([]) }
const emptySettingsService: ISettingsService = {
  getPublic: vi.fn().mockRejectedValue(new Error('Not used')),
}

const confirmation = {
  bankDetails: null,
  createdAt: '2026-08-02T15:00:00.000Z',
  delivery: { method: 'pickup' as const, shippingAddress: null },
  items: [{ lineTotal: 1200, name: 'Caja decorada', quantity: 2, unitPrice: 600 }],
  orderNumber: 'MAD-20260802-000001',
  paymentMethod: 'cash' as const,
  pickup: {
    address: 'Calle 123',
    businessHours: 'Lunes a viernes',
    mapsUrl: 'https://maps.google.com/example',
  },
  status: 'pending' as const,
  totals: { discount: 0, discountPercentage: 0, subtotal: 1200, total: 1200 },
  whatsappProofUrl: 'https://wa.me/5491100000000?text=pedido',
}

const createOrder = vi.fn().mockResolvedValue({
  confirmation,
  sessionExpiresAt: new Date('2026-09-01T15:00:00.000Z'),
  sessionTokenToSet: 'A'.repeat(43),
})
const orderService: IOrderService = { create: createOrder }

function getApp(): Express {
  return createApp(
    TEST_ENV,
    createLogger(TEST_ENV),
    createTestDependencies(
      emptyCategoryService,
      emptyProductService,
      emptySettingsService,
      orderService,
    ),
  )
}

function getSetCookies(response: request.Response): string[] {
  const value = response.headers['set-cookie']
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

const validBody = {
  customer: {
    firstName: 'Ana',
    lastName: 'Pérez',
    notes: '',
    phone: '+54 9 11 2345-6789',
  },
  deliveryMethod: 'pickup',
  items: [{ productId: 'ad0047db-6715-4cc0-a559-6a72649063bb', quantity: 2 }],
  paymentMethod: 'cash',
  shippingAddress: '',
}

const IDEMPOTENCY_KEY = 'checkout-attempt-0001'

describe('order API', () => {
  it('issues a signed CSRF token in a host-only secure cookie', async () => {
    const response = await request(getApp()).get('/api/public/csrf-token').expect(200)
    const token = response.body.data.csrfToken as string
    const cookie = getSetCookies(response)[0] ?? ''

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/)
    expect(cookie).toContain(`${CSRF_COOKIE_NAME}=${token}`)
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).not.toContain('HttpOnly')
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('requires both an allowed Origin and a valid double-submit CSRF token', async () => {
    const app = getApp()
    const csrfResponse = await request(app).get('/api/public/csrf-token')
    const token = csrfResponse.body.data.csrfToken as string

    await request(app)
      .post('/api/orders')
      .set('Cookie', `${CSRF_COOKIE_NAME}=${token}`)
      .set('X-CSRF-Token', token)
      .set('Idempotency-Key', IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(403)

    await request(app)
      .post('/api/orders')
      .set('Origin', TEST_ENV.corsAllowedOrigins[0] ?? '')
      .set('Cookie', `${CSRF_COOKIE_NAME}=${token}`)
      .set('X-CSRF-Token', `${token}tampered`)
      .set('Idempotency-Key', IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(403)
  })

  it('creates an order and emits the anonymous credential only as an HttpOnly cookie', async () => {
    const app = getApp()
    const csrfResponse = await request(app).get('/api/public/csrf-token')
    const token = csrfResponse.body.data.csrfToken as string
    const response = await request(app)
      .post('/api/orders')
      .set('Origin', TEST_ENV.corsAllowedOrigins[0] ?? '')
      .set('Cookie', `${CSRF_COOKIE_NAME}=${token}`)
      .set('X-CSRF-Token', token)
      .set('Idempotency-Key', IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(201)

    const sessionCookie = getSetCookies(response)
      .find((cookie) => cookie.startsWith(`${GUEST_SESSION_COOKIE_NAME}=`)) ?? ''

    expect(response.body).toEqual({ success: true, data: confirmation })
    expect(response.body.data).not.toHaveProperty('customer')
    expect(response.body.data).not.toHaveProperty('orderId')
    expect(JSON.stringify(response.body)).not.toContain('A'.repeat(43))
    expect(sessionCookie).toContain('HttpOnly')
    expect(sessionCookie).toContain('Secure')
    expect(sessionCookie).toContain('SameSite=Lax')
    expect(sessionCookie).toContain('Path=/')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
  })

  it('rejects unknown fields and invalid quantities before calling the service', async () => {
    createOrder.mockClear()
    const app = getApp()
    const csrfResponse = await request(app).get('/api/public/csrf-token')
    const token = csrfResponse.body.data.csrfToken as string

    await request(app)
      .post('/api/orders')
      .set('Origin', TEST_ENV.corsAllowedOrigins[0] ?? '')
      .set('Cookie', `${CSRF_COOKIE_NAME}=${token}`)
      .set('X-CSRF-Token', token)
      .set('Idempotency-Key', IDEMPOTENCY_KEY)
      .send({ ...validBody, unexpected: true, items: [{ ...validBody.items[0], quantity: 0 }] })
      .expect(400)

    expect(createOrder).not.toHaveBeenCalled()
  })
})
