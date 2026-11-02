import type { Express } from 'express'
import request from 'supertest'
import type { Test } from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import { AdminPaymentController } from '../controllers/admin-payments.controller.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminPaymentService } from '../services/admin-payments.service.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IProductService } from '../services/products.service.js'
import type { ISettingsService } from '../services/settings.service.js'
import { AppError } from '../utils/app-error.js'
import { ADMIN_ACCESS_COOKIE_NAME, CSRF_COOKIE_NAME } from '../utils/cookies.js'
import { createTestDependencies, TEST_ADMIN_ORIGIN, TEST_ENV } from './test-helpers.js'

const PROFILE = {
  email: 'admin@example.com',
  fullName: 'Administradora',
  id: 'bd62774b-7863-4fb4-a041-60d9003a4432',
  isActive: true,
  role: 'administrator' as const,
}
const ATTEMPT_ID = '3a2b9148-7dbf-4b88-a47f-296205f5e4de'
const SYNC_PATH = `/api/admin/payments/${ATTEMPT_ID}/sync`

function createAuthService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({ profile: PROFILE, tokensToSet: null }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function createPaymentService(): IAdminPaymentService {
  return {
    list: vi.fn(),
    retry: vi.fn(),
    review: vi.fn(),
    sync: vi.fn().mockResolvedValue({ auditRecorded: true }),
  }
}

function getApp(
  paymentService: IAdminPaymentService,
  authService: IAdminAuthService = createAuthService(),
): Express {
  const categoryService: ICategoryService = { listPublic: vi.fn().mockResolvedValue([]) }
  const productService: IProductService = { listPublic: vi.fn().mockResolvedValue([]) }
  const settingsService: ISettingsService = { getPublic: vi.fn() }
  const dependencies = createTestDependencies(
    categoryService,
    productService,
    settingsService,
    undefined,
    undefined,
    authService,
  )

  return createApp(TEST_ENV, createLogger(TEST_ENV), {
    ...dependencies,
    adminPaymentController: new AdminPaymentController(paymentService),
  })
}

async function getCsrf(app: Express): Promise<string> {
  const response = await request(app).get('/api/admin/auth/csrf-token').expect(200)
  return String(response.body.data.csrfToken)
}

function postSync(app: Express, token: string, path = SYNC_PATH): Test {
  return request(app)
    .post(path)
    .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
    .set('Origin', TEST_ADMIN_ORIGIN)
    .set('X-CSRF-Token', token)
}

describe('admin payment consultation API (POST /api/admin/payments/:attemptId/sync)', () => {
  it('requires an active administrative session', async () => {
    const authService = createAuthService()
    vi.mocked(authService.authenticate).mockRejectedValue(
      new AppError(401, 'Tu sesión no es válida o venció', 'ADMIN_SESSION_REQUIRED'),
    )
    const service = createPaymentService()
    const app = getApp(service, authService)
    const token = await getCsrf(app)

    await postSync(app, token).send({}).expect(401)
    expect(service.sync).not.toHaveBeenCalled()
  })

  it('rejects a request without Origin and CSRF protection', async () => {
    const service = createPaymentService()
    const app = getApp(service)

    const response = await request(app)
      .post(SYNC_PATH)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access`)
      .send({})

    expect(response.status).toBe(403)
    expect(service.sync).not.toHaveBeenCalled()
  })

  it('consults the attempt as the authenticated administrator and returns the audit result privately', async () => {
    const service = createPaymentService()
    const app = getApp(service)
    const token = await getCsrf(app)

    const response = await postSync(app, token).send({}).expect(200)

    expect(service.sync).toHaveBeenCalledWith(ATTEMPT_ID, PROFILE.id)
    expect(response.body).toEqual({ success: true, data: { auditRecorded: true } })
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('reports that the consultation was not audited without failing the request', async () => {
    const service = createPaymentService()
    vi.mocked(service.sync).mockResolvedValue({ auditRecorded: false })
    const app = getApp(service)
    const token = await getCsrf(app)

    const response = await postSync(app, token).send({}).expect(200)

    expect(response.body).toEqual({ success: true, data: { auditRecorded: false } })
  })

  it('rejects an attempt id that is not a UUID', async () => {
    const service = createPaymentService()
    const app = getApp(service)
    const token = await getCsrf(app)

    await postSync(app, token, '/api/admin/payments/not-a-uuid/sync').send({}).expect(400)
    expect(service.sync).not.toHaveBeenCalled()
  })

  it('rejects a body with unexpected fields', async () => {
    const service = createPaymentService()
    const app = getApp(service)
    const token = await getCsrf(app)

    await postSync(app, token).send({ status: 'approved' }).expect(400)
    expect(service.sync).not.toHaveBeenCalled()
  })

  it('answers with the service error status when the attempt does not exist', async () => {
    const service = createPaymentService()
    vi.mocked(service.sync).mockRejectedValue(
      new AppError(404, 'No encontramos el intento de pago', 'PAYMENT_ATTEMPT_NOT_FOUND'),
    )
    const app = getApp(service)
    const token = await getCsrf(app)

    const response = await postSync(app, token).send({}).expect(404)

    expect(response.body.success).toBe(false)
  })
})
