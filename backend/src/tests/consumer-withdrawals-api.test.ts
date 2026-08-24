import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { ConsumerWithdrawalController } from '../controllers/consumer-withdrawals.controller.js'
import { createLogger } from '../config/logger.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IConsumerWithdrawalService } from '../services/consumer-withdrawals.service.js'
import type { IProductService } from '../services/products.service.js'
import type { ISettingsService } from '../services/settings.service.js'
import { CSRF_COOKIE_NAME } from '../utils/cookies.js'
import { createTestDependencies, TEST_ADMIN_ORIGIN, TEST_ENV } from './test-helpers.js'

function service(): IConsumerWithdrawalService {
  return {
    create: vi.fn().mockResolvedValue({
      message: 'Recibimos tu solicitud.',
      nextStep: 'Guardá este código para consultar el estado.',
      requestCode: 'AR-ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ23',
      status: 'received',
      submittedAt: '2026-08-19T15:00:00.000Z',
    }),
    getStatus: vi.fn().mockResolvedValue({
      explanation: 'Registramos tu solicitud.',
      nextStep: 'Estamos revisando la información.',
      status: 'received',
      submittedAt: '2026-08-19T15:00:00.000Z',
      updatedAt: '2026-08-19T15:00:00.000Z',
    }),
  }
}

function app(withdrawalService: IConsumerWithdrawalService): Express {
  const categories: ICategoryService = { listPublic: vi.fn().mockResolvedValue([]) }
  const products: IProductService = { listPublic: vi.fn().mockResolvedValue([]) }
  const settings: ISettingsService = { getPublic: vi.fn() }
  const dependencies = createTestDependencies(categories, products, settings)
  dependencies.consumerWithdrawalController = new ConsumerWithdrawalController(withdrawalService)
  return createApp(TEST_ENV, createLogger(TEST_ENV), dependencies)
}

async function csrf(target: Express): Promise<{ cookie: string; token: string }> {
  const response = await request(target).get('/api/public/csrf-token').expect(200)
  return {
    cookie: String(response.headers['set-cookie']?.[0] ?? '').split(';')[0] ?? '',
    token: String(response.body.data.csrfToken),
  }
}

describe('consumer withdrawals API', () => {
  it('requires origin, CSRF and idempotency while returning a private receipt', async () => {
    const withdrawalService = service()
    const target = app(withdrawalService)
    const security = await csrf(target)
    const response = await request(target).post('/api/public/consumer-withdrawals')
      .set('Cookie', `${CSRF_COOKIE_NAME}=${security.token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', security.token)
      .set('Idempotency-Key', 'withdrawal-idempotency-key-0001')
      .send({ orderNumberUnavailable: true, phone: '3511234567' })
      .expect(201)

    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
    expect(withdrawalService.create).toHaveBeenCalledWith(
      { orderNumberUnavailable: true, phone: '3511234567' },
      'withdrawal-idempotency-key-0001',
      expect.any(String),
    )
  })

  it('rejects ambiguous order identification before calling the service', async () => {
    const withdrawalService = service()
    const target = app(withdrawalService)
    const security = await csrf(target)
    await request(target).post('/api/public/consumer-withdrawals')
      .set('Cookie', security.cookie)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', security.token)
      .set('Idempotency-Key', 'withdrawal-idempotency-key-0001')
      .send({
        orderNumber: 'MAD-20260819-000001',
        orderNumberUnavailable: true,
        phone: '3511234567',
      }).expect(400)
    expect(withdrawalService.create).not.toHaveBeenCalled()
  })

  it('consults status through the body without issuing a session cookie', async () => {
    const withdrawalService = service()
    const target = app(withdrawalService)
    const security = await csrf(target)
    const response = await request(target).post('/api/public/consumer-withdrawals/status')
      .set('Cookie', security.cookie)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', security.token)
      .send({ requestCode: 'AR-ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ23' })
      .expect(200)
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(withdrawalService.getStatus).toHaveBeenCalledWith(
      'AR-ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ23',
      undefined,
      expect.any(String),
    )
  })
})
