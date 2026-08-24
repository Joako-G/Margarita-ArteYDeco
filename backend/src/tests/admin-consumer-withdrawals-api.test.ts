import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { AdminConsumerWithdrawalController } from '../controllers/admin-consumer-withdrawals.controller.js'
import { createLogger } from '../config/logger.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminConsumerWithdrawalService } from '../services/admin-consumer-withdrawals.service.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IProductService } from '../services/products.service.js'
import type { ISettingsService } from '../services/settings.service.js'
import { ADMIN_ACCESS_COOKIE_NAME, CSRF_COOKIE_NAME } from '../utils/cookies.js'
import { createTestDependencies, TEST_ADMIN_ORIGIN, TEST_ENV } from './test-helpers.js'

const REQUEST_ID = 'a7043af9-ce26-451f-aaba-2041dd6383ba'
const PROFILE = {
  email: 'admin@example.com',
  fullName: 'Administradora',
  id: 'bd62774b-7863-4fb4-a041-60d9003a4432',
  isActive: true,
  role: 'administrator' as const,
}

function adminService(): IAdminConsumerWithdrawalService {
  return {
    createContingency: vi.fn(),
    executeAction: vi.fn().mockResolvedValue({ id: REQUEST_ID }),
    getById: vi.fn().mockResolvedValue({ id: REQUEST_ID }),
    getOrderCandidates: vi.fn().mockResolvedValue([]),
    linkOrder: vi.fn(),
    list: vi.fn().mockResolvedValue({
      items: [],
      pagination: { hasNextPage: false, hasPreviousPage: false, page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    }),
  }
}

function authService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({ profile: PROFILE, tokensToSet: null }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function app(service: IAdminConsumerWithdrawalService): Express {
  const categories: ICategoryService = { listPublic: vi.fn().mockResolvedValue([]) }
  const products: IProductService = { listPublic: vi.fn().mockResolvedValue([]) }
  const settings: ISettingsService = { getPublic: vi.fn() }
  const dependencies = createTestDependencies(
    categories,
    products,
    settings,
    undefined,
    undefined,
    authService(),
  )
  dependencies.adminConsumerWithdrawalController = new AdminConsumerWithdrawalController(service)
  return createApp(TEST_ENV, createLogger(TEST_ENV), dependencies)
}

async function csrf(target: Express): Promise<string> {
  const response = await request(target).get('/api/admin/auth/csrf-token').expect(200)
  return String(response.body.data.csrfToken)
}

describe('admin consumer withdrawals API', () => {
  it('accepts the complete operational filter contract', async () => {
    const service = adminService()
    await request(app(service)).get('/api/admin/consumer-withdrawals')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access`)
      .query({
        compliance: 'attention',
        linkage: 'unlinked',
        page: 2,
        pageSize: 10,
        search: 'ABC234',
        sort: 'urgent',
        status: 'verification_pending',
      }).expect(200)
    expect(service.list).toHaveBeenCalledWith({
      compliance: 'attention',
      linkage: 'unlinked',
      page: 2,
      pageSize: 10,
      search: 'ABC234',
      sort: 'urgent',
      status: 'verification_pending',
    })
  })

  it('requires CSRF, origin, idempotency and a public explanation for non-applicability', async () => {
    const service = adminService()
    const target = app(service)
    const token = await csrf(target)
    await request(target).post(`/api/admin/consumer-withdrawals/${REQUEST_ID}/actions`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .set('Idempotency-Key', 'withdrawal-admin-action-key-001')
      .send({
        action: 'determineNotApplicable',
        expectedVersion: 1,
        reason: 'Fundamento interno suficiente',
      }).expect(400)
    expect(service.executeAction).not.toHaveBeenCalled()
  })

  it('passes the authenticated actor to a valid administrative action', async () => {
    const service = adminService()
    const target = app(service)
    const token = await csrf(target)
    const payload = {
      action: 'determineNotApplicable',
      expectedVersion: 1,
      publicExplanation: 'El caso no está alcanzado; podés solicitar una revisión.',
      reason: 'Excepción revisada individualmente',
    }
    await request(target).post(`/api/admin/consumer-withdrawals/${REQUEST_ID}/actions`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .set('Idempotency-Key', 'withdrawal-admin-action-key-002')
      .send(payload).expect(200)
    expect(service.executeAction).toHaveBeenCalledWith(
      REQUEST_ID,
      payload,
      PROFILE.id,
      'withdrawal-admin-action-key-002',
    )
  })

  it('requires an explicit total confirmation for manual refunds', async () => {
    const service = adminService()
    const target = app(service)
    const token = await csrf(target)
    await request(target).post(`/api/admin/consumer-withdrawals/${REQUEST_ID}/actions`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .set('Idempotency-Key', 'withdrawal-admin-refund-key-001')
      .send({
        action: 'confirmManualRefund',
        expectedVersion: 1,
        reason: 'Transferencia realizada',
        reference: 'Operación 123',
        returnShippingRefundAmount: 0,
      }).expect(400)
    expect(service.executeAction).not.toHaveBeenCalled()
  })
})
