import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminInventoryService } from '../services/admin-inventory.service.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IProductService } from '../services/products.service.js'
import type { ISettingsService } from '../services/settings.service.js'
import { AppError } from '../utils/app-error.js'
import { ADMIN_ACCESS_COOKIE_NAME, CSRF_COOKIE_NAME } from '../utils/cookies.js'
import {
  createTestDependencies,
  TEST_ADMIN_ORIGIN,
  TEST_ENV,
} from './test-helpers.js'

const PRODUCT_ID = '9b66d7f7-f41c-485f-8a65-a3ac1ef8f3ee'
const PROFILE = {
  email: 'admin@example.com',
  fullName: 'Administradora',
  id: 'bd62774b-7863-4fb4-a041-60d9003a4432',
  isActive: true,
  role: 'administrator' as const,
}

function createAuthService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({ profile: PROFILE, tokensToSet: null }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function createInventoryService(): IAdminInventoryService {
  return {
    adjustStock: vi.fn().mockResolvedValue({ stockQuantity: 8 }),
    getHistory: vi.fn().mockResolvedValue({
      movements: [],
      pagination: {
        hasNextPage: false,
        hasPreviousPage: false,
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      },
      product: { id: PRODUCT_ID, name: 'Pincel redondo', stockQuantity: 5 },
    }),
  }
}

function getApp(
  service: IAdminInventoryService,
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
      service,
    ),
  )
}

describe('admin inventory API', () => {
  it('requires an active administrative session', async () => {
    const service = createInventoryService()
    const authService = createAuthService()
    vi.mocked(authService.authenticate).mockRejectedValue(
      new AppError(401, 'Tu sesión no es válida o venció', 'ADMIN_SESSION_REQUIRED'),
    )

    await request(getApp(service, authService))
      .get(`/api/admin/products/${PRODUCT_ID}/inventory`)
      .expect(401)

    expect(service.getHistory).not.toHaveBeenCalled()
  })

  it('returns private paginated inventory history', async () => {
    const service = createInventoryService()
    const response = await request(getApp(service))
      .get(`/api/admin/products/${PRODUCT_ID}/inventory?page=1&pageSize=10`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access-token`)
      .expect(200)

    expect(service.getHistory).toHaveBeenCalledWith(PRODUCT_ID, { page: 1, pageSize: 10 })
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body.data.product.stockQuantity).toBe(5)
  })

  it('requires a valid Origin and CSRF token before adjusting stock', async () => {
    const service = createInventoryService()
    const app = getApp(service)

    await request(app)
      .post(`/api/admin/products/${PRODUCT_ID}/inventory-adjustments`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access-token`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .send({ direction: 'increase', quantity: 3, reason: 'Reposición' })
      .expect(403)

    expect(service.adjustStock).not.toHaveBeenCalled()
  })

  it('validates and attributes an adjustment to the authenticated administrator', async () => {
    const service = createInventoryService()
    const app = getApp(service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string
    const payload = { direction: 'increase', quantity: 3, reason: ' Reposición de depósito ' }

    const response = await request(app)
      .post(`/api/admin/products/${PRODUCT_ID}/inventory-adjustments`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(payload)
      .expect(200)

    expect(service.adjustStock).toHaveBeenCalledWith(PRODUCT_ID, {
      ...payload,
      reason: 'Reposición de depósito',
    }, PROFILE.id)
    expect(response.body).toEqual({ success: true, data: { stockQuantity: 8 } })
  })

  it('rejects invalid quantities before reaching the inventory service', async () => {
    const service = createInventoryService()
    const app = getApp(service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string

    await request(app)
      .post(`/api/admin/products/${PRODUCT_ID}/inventory-adjustments`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send({ direction: 'decrease', quantity: 0, reason: 'Corrección' })
      .expect(400)

    expect(service.adjustStock).not.toHaveBeenCalled()
  })
})
