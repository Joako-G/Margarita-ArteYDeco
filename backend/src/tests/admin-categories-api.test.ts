import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminCategoryService } from '../services/admin-categories.service.js'
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

const CATEGORY = {
  catalogArea: 'art' as const,
  description: 'Materiales para pintar',
  displayOrder: 2,
  id: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
  imageUrl: 'https://storage.test/category',
  isActive: true,
  name: 'Pinceles',
  productCount: 4,
  slug: 'pinceles',
  updatedAt: '2026-08-03T12:00:00.000Z',
}

function createAuthService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({ profile: PROFILE, tokensToSet: null }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function createCategoryService(): IAdminCategoryService {
  return {
    create: vi.fn().mockResolvedValue(CATEGORY),
    getById: vi.fn().mockResolvedValue(CATEGORY),
    list: vi.fn().mockResolvedValue({
      items: [CATEGORY],
      pagination: {
        hasNextPage: false,
        hasPreviousPage: false,
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      },
    }),
    replaceImage: vi.fn().mockResolvedValue(CATEGORY),
    setPublication: vi.fn().mockResolvedValue(CATEGORY),
    softDelete: vi.fn(),
    update: vi.fn().mockResolvedValue(CATEGORY),
  }
}

function getApp(
  adminCategoryService: IAdminCategoryService,
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
      adminCategoryService,
    ),
  )
}

describe('admin categories API', () => {
  it('requires an active administrative session', async () => {
    const authService = createAuthService()
    vi.mocked(authService.authenticate).mockRejectedValue(
      new AppError(401, 'Tu sesión no es válida o venció', 'ADMIN_SESSION_REQUIRED'),
    )
    const service = createCategoryService()

    await request(getApp(service, authService)).get('/api/admin/categories').expect(401)
    expect(service.list).not.toHaveBeenCalled()
  })

  it('validates filters and returns a private paginated contract', async () => {
    const service = createCategoryService()
    const response = await request(getApp(service))
      .get('/api/admin/categories')
      .query({ area: 'art', page: 1, pageSize: 10, publication: 'active', sort: 'orderAsc' })
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access`)
      .expect(200)

    expect(service.list).toHaveBeenCalledWith({
      area: 'art',
      page: 1,
      pageSize: 10,
      publication: 'active',
      sort: 'orderAsc',
    })
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('creates an inactive category only with Origin and CSRF validation', async () => {
    const service = createCategoryService()
    const app = getApp(service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string
    const payload = {
      catalogArea: 'art',
      description: null,
      name: 'Papeles',
    }

    await request(app)
      .post('/api/admin/categories')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(payload)
      .expect(201)

    expect(service.create).toHaveBeenCalledWith(payload, PROFILE.id)
  })

  it('accepts but discards the legacy display order during creation', async () => {
    const service = createCategoryService()
    const app = getApp(service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string

    await request(app)
      .post('/api/admin/categories')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send({
        catalogArea: 'art',
        description: null,
        displayOrder: 99,
        name: 'Papeles',
      })
      .expect(201)

    expect(service.create).toHaveBeenCalledWith({
      catalogArea: 'art',
      description: null,
      name: 'Papeles',
    }, PROFILE.id)
  })

  it('validates the real image signature before replacing it', async () => {
    const service = createCategoryService()
    const app = getApp(service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string

    await request(app)
      .put(`/api/admin/categories/${CATEGORY.id}/image`)
      .query({ expectedUpdatedAt: CATEGORY.updatedAt })
      .set('Content-Type', 'image/png')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(Buffer.from('not-a-png'))
      .expect(400)

    expect(service.replaceImage).not.toHaveBeenCalled()
  })

  it('updates publication with optimistic concurrency data', async () => {
    const service = createCategoryService()
    const app = getApp(service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string
    const payload = { expectedUpdatedAt: CATEGORY.updatedAt, isActive: false }

    await request(app)
      .patch(`/api/admin/categories/${CATEGORY.id}/publication`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(payload)
      .expect(200)

    expect(service.setPublication).toHaveBeenCalledWith(CATEGORY.id, payload, PROFILE.id)
  })

  it('soft deletes with explicit concurrency data and no physical storage operation', async () => {
    const service = createCategoryService()
    const app = getApp(service)
    const csrfResponse = await request(app).get('/api/admin/auth/csrf-token').expect(200)
    const token = csrfResponse.body.data.csrfToken as string

    await request(app)
      .delete(`/api/admin/categories/${CATEGORY.id}`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send({ expectedUpdatedAt: CATEGORY.updatedAt })
      .expect(204)

    expect(service.softDelete).toHaveBeenCalledWith(CATEGORY.id, CATEGORY.updatedAt, PROFILE.id)
  })
})
