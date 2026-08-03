import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminCustomerService } from '../services/admin-customers.service.js'
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
const CUSTOMER_ID = '3a2b9148-7dbf-4b88-a47f-296205f5e4de'
const UPDATED_AT = '2026-08-03T12:00:00.000Z'

function createAuthService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({ profile: PROFILE, tokensToSet: null }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function createCustomerService(): IAdminCustomerService {
  return {
    getById: vi.fn(),
    list: vi.fn().mockResolvedValue({
      items: [],
      pagination: {
        hasNextPage: false,
        hasPreviousPage: false,
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      },
    }),
    softDelete: vi.fn(),
    update: vi.fn(),
  }
}

function getApp(
  adminCustomerService: IAdminCustomerService,
  authService: IAdminAuthService = createAuthService(),
): Express {
  const categoryService: ICategoryService = { listPublic: vi.fn().mockResolvedValue([]) }
  const productService: IProductService = { listPublic: vi.fn().mockResolvedValue([]) }
  const settingsService: ISettingsService = { getPublic: vi.fn() }
  return createApp(
    TEST_ENV,
    createLogger(TEST_ENV),
    createTestDependencies(
      categoryService,
      productService,
      settingsService,
      undefined,
      undefined,
      authService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      adminCustomerService,
    ),
  )
}

async function getCsrf(app: Express): Promise<string> {
  const response = await request(app).get('/api/admin/auth/csrf-token').expect(200)
  return String(response.body.data.csrfToken)
}

describe('admin customers API', () => {
  it('requires an active administrative session', async () => {
    const authService = createAuthService()
    vi.mocked(authService.authenticate).mockRejectedValue(
      new AppError(401, 'Tu sesión no es válida o venció', 'ADMIN_SESSION_REQUIRED'),
    )
    const service = createCustomerService()

    await request(getApp(service, authService)).get('/api/admin/customers').expect(401)
    expect(service.list).not.toHaveBeenCalled()
  })

  it('validates private list filters', async () => {
    const service = createCustomerService()
    const response = await request(getApp(service))
      .get('/api/admin/customers')
      .query({ page: 2, pageSize: 20, search: 'Ana', sort: 'newest' })
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access`)
      .expect(200)

    expect(service.list).toHaveBeenCalledWith({ page: 2, pageSize: 20, search: 'Ana', sort: 'newest' })
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('requires Origin and CSRF for updates', async () => {
    const service = createCustomerService()
    const app = getApp(service)
    const token = await getCsrf(app)
    const payload = {
      expectedUpdatedAt: UPDATED_AT,
      firstName: 'Ana',
      lastName: 'Pérez',
      notes: null,
      phone: '+54 9 11 5555-1234',
    }

    await request(app)
      .put(`/api/admin/customers/${CUSTOMER_ID}`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(payload)
      .expect(200)

    expect(service.update).toHaveBeenCalledWith(CUSTOMER_ID, payload, PROFILE.id)
  })

  it('validates destructive writes and passes the administrator', async () => {
    const service = createCustomerService()
    const app = getApp(service)
    const token = await getCsrf(app)

    await request(app)
      .delete(`/api/admin/customers/${CUSTOMER_ID}`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send({ expectedUpdatedAt: UPDATED_AT })
      .expect(204)

    expect(service.softDelete).toHaveBeenCalledWith(CUSTOMER_ID, UPDATED_AT, PROFILE.id)
  })
})
