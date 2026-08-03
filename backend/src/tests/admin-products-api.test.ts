import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminProductService } from '../services/admin-products.service.js'
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

const PROFILE = {
  email: 'admin@example.com',
  fullName: 'Administradora',
  id: 'bd62774b-7863-4fb4-a041-60d9003a4432',
  isActive: true,
  role: 'administrator' as const,
}

const PRODUCT = {
  catalogArea: 'art' as const,
  category: {
    id: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
    name: 'Pinceles',
  },
  id: '9b66d7f7-f41c-485f-8a65-a3ac1ef8f3ee',
  imageUrl: 'https://storage.test/pincel',
  isActive: true,
  isFeatured: false,
  name: 'Pincel redondo',
  price: 4_500,
  slug: 'pincel-redondo',
  stockQuantity: 4,
  stockStatus: 'inStock' as const,
  updatedAt: '2026-08-03T12:00:00.000Z',
}

const PAGE = {
  items: [PRODUCT],
  pagination: {
    hasNextPage: false,
    hasPreviousPage: false,
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  },
}

const DETAIL = {
  catalogArea: 'art' as const,
  category: PRODUCT.category,
  description: 'Pincel para detalles',
  id: PRODUCT.id,
  imageUrl: null,
  isActive: true,
  isFeatured: false,
  name: 'Pincel redondo',
  price: 4_500,
  slug: 'pincel-redondo',
  stockQuantity: 4,
  updatedAt: '2026-08-03T12:00:00.000Z',
}

function createAuthorizedAuthService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({ profile: PROFILE, tokensToSet: null }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function createAdminProductService(): IAdminProductService {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    getCategoryOptions: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue(PAGE),
    removeImage: vi.fn(),
    replaceImage: vi.fn(),
    setFeatured: vi.fn(),
    setPublication: vi.fn(),
    softDelete: vi.fn(),
    update: vi.fn(),
  }
}

function getApp(
  authService: IAdminAuthService,
  adminProductService: IAdminProductService,
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
      adminProductService,
    ),
  )
}

describe('admin products API', () => {
  it('requires an active administrative session', async () => {
    const authService = createAuthorizedAuthService()
    vi.mocked(authService.authenticate).mockRejectedValue(
      new AppError(401, 'Tu sesión no es válida o venció', 'ADMIN_SESSION_REQUIRED'),
    )
    const service = createAdminProductService()

    await request(getApp(authService, service)).get('/api/admin/products').expect(401)

    expect(service.list).not.toHaveBeenCalled()
  })

  it('validates filters and returns a private paginated contract', async () => {
    const authService = createAuthorizedAuthService()
    const service = createAdminProductService()
    const response = await request(getApp(authService, service))
      .get('/api/admin/products')
      .query({
        page: 1,
        pageSize: 20,
        publication: 'inactive',
        search: ' pincel ',
        sort: 'stockAsc',
        stock: 'outOfStock',
      })
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access-token`)
      .expect(200)

    expect(service.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      publication: 'inactive',
      search: 'pincel',
      sort: 'stockAsc',
      stock: 'outOfStock',
    })
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body).toEqual({ success: true, data: PAGE })
    expect(JSON.stringify(response.body)).not.toContain('image_path')
    expect(JSON.stringify(response.body)).not.toContain('deleted_at')
  })

  it('rejects invalid or unknown query parameters before reading products', async () => {
    const service = createAdminProductService()

    await request(getApp(createAuthorizedAuthService(), service))
      .get('/api/admin/products?pageSize=100&unknown=true')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access-token`)
      .expect(400)

    expect(service.list).not.toHaveBeenCalled()
  })

  it('creates a product only with a valid administrative CSRF token', async () => {
    const service = createAdminProductService()
    vi.mocked(service.create).mockResolvedValue(DETAIL)
    const app = getApp(createAuthorizedAuthService(), service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string
    const payload = {
      categoryId: DETAIL.category.id,
      description: DETAIL.description,
      isActive: true,
      isFeatured: false,
      name: DETAIL.name,
      price: DETAIL.price,
      stockQuantity: DETAIL.stockQuantity,
    }

    await request(app)
      .post('/api/admin/products')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(payload)
      .expect(201)

    expect(service.create).toHaveBeenCalledWith(payload, PROFILE.id)
  })

  it('rejects product writes without CSRF validation', async () => {
    const service = createAdminProductService()

    await request(getApp(createAuthorizedAuthService(), service))
      .post('/api/admin/products')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .send({})
      .expect(403)

    expect(service.create).not.toHaveBeenCalled()
  })

  it('validates the actual image signature before replacing it', async () => {
    const service = createAdminProductService()
    const app = getApp(createAuthorizedAuthService(), service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string

    await request(app)
      .put(`/api/admin/products/${DETAIL.id}/image`)
      .query({ expectedUpdatedAt: DETAIL.updatedAt })
      .set('Content-Type', 'image/png')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(Buffer.from('not-a-png'))
      .expect(400)

    expect(service.replaceImage).not.toHaveBeenCalled()
  })

  it('changes publication state only with CSRF validation and the authenticated actor', async () => {
    const service = createAdminProductService()
    vi.mocked(service.setPublication).mockResolvedValue({ ...DETAIL, isActive: false })
    const app = getApp(createAuthorizedAuthService(), service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string
    const payload = { expectedUpdatedAt: DETAIL.updatedAt, isActive: false }

    await request(app)
      .patch(`/api/admin/products/${DETAIL.id}/publication`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(payload)
      .expect(200)

    expect(service.setPublication).toHaveBeenCalledWith(DETAIL.id, payload, PROFILE.id)
  })

  it('validates the featured state payload before calling the service', async () => {
    const service = createAdminProductService()
    const app = getApp(createAuthorizedAuthService(), service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string

    await request(app)
      .patch(`/api/admin/products/${DETAIL.id}/featured`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send({ expectedUpdatedAt: DETAIL.updatedAt, isFeatured: 'yes' })
      .expect(400)

    expect(service.setFeatured).not.toHaveBeenCalled()
  })

  it('soft deletes a product with concurrency data and returns no content', async () => {
    const service = createAdminProductService()
    vi.mocked(service.softDelete).mockResolvedValue(undefined)
    const app = getApp(createAuthorizedAuthService(), service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string

    await request(app)
      .delete(`/api/admin/products/${DETAIL.id}`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send({ expectedUpdatedAt: DETAIL.updatedAt })
      .expect(204)

    expect(service.softDelete).toHaveBeenCalledWith(DETAIL.id, DETAIL.updatedAt, PROFILE.id)
  })
})
