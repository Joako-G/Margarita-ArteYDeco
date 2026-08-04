import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminProfileService } from '../services/admin-profile.service.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IProductService } from '../services/products.service.js'
import type { ISettingsService } from '../services/settings.service.js'
import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from '../utils/cookies.js'
import { createTestDependencies, TEST_ADMIN_ORIGIN, TEST_ENV } from './test-helpers.js'

const PROFILE = {
  createdAt: '2026-08-01T12:00:00.000Z',
  email: 'admin@example.com',
  fullName: 'Administradora',
  id: 'bd62774b-7863-4fb4-a041-60d9003a4432',
  isActive: true,
  role: 'administrator' as const,
  updatedAt: '2026-08-03T12:00:00.000Z',
}

function createAuthService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({
      profile: PROFILE,
      tokensToSet: null,
    }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function createProfileService(): IAdminProfileService {
  return {
    get: vi.fn().mockResolvedValue(PROFILE),
    requestEmailChange: vi.fn().mockResolvedValue({
      email: 'nuevo@example.com',
      status: 'confirmation_pending',
    }),
    updateFullName: vi.fn().mockResolvedValue({ ...PROFILE, fullName: 'Margarita Admin' }),
    updatePassword: vi.fn().mockResolvedValue(undefined),
  }
}

function getApp(profileService: IAdminProfileService): Express {
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
      createAuthService(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      profileService,
    ),
  )
}

async function getCsrf(app: Express): Promise<string> {
  const response = await request(app).get('/api/admin/auth/csrf-token').expect(200)
  return String(response.body.data.csrfToken)
}

const sessionCookies = [
  `${ADMIN_ACCESS_COOKIE_NAME}=access-token`,
  `${ADMIN_REFRESH_COOKIE_NAME}=refresh-token`,
]

function getSetCookies(response: request.Response): string[] {
  const value = response.headers['set-cookie']
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

describe('admin profile API', () => {
  it('returns the private profile without internal authorization fields', async () => {
    const response = await request(getApp(createProfileService()))
      .get('/api/admin/profile')
      .set('Cookie', sessionCookies)
      .expect(200)

    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body.data).toMatchObject({ email: PROFILE.email, fullName: PROFILE.fullName })
    expect(response.body.data).not.toHaveProperty('id')
    expect(response.body.data).not.toHaveProperty('isActive')
  })

  it('protects name updates with Origin and CSRF', async () => {
    const service = createProfileService()
    const app = getApp(service)
    const token = await getCsrf(app)

    await request(app)
      .put('/api/admin/profile/name')
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('Cookie', [...sessionCookies, `${CSRF_COOKIE_NAME}=${token}`])
      .set('X-CSRF-Token', token)
      .send({ expectedUpdatedAt: PROFILE.updatedAt, fullName: 'Margarita Admin' })
      .expect(200)

    expect(service.updateFullName).toHaveBeenCalledWith(PROFILE.id, {
      expectedUpdatedAt: PROFILE.updatedAt,
      fullName: 'Margarita Admin',
    })
  })

  it('passes only server-side session credentials to an email change', async () => {
    const service = createProfileService()
    const app = getApp(service)
    const token = await getCsrf(app)

    await request(app)
      .put('/api/admin/profile/email')
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('Cookie', [...sessionCookies, `${CSRF_COOKIE_NAME}=${token}`])
      .set('X-CSRF-Token', token)
      .send({ currentPassword: 'current-password', email: 'Nuevo@Example.com' })
      .expect(200)

    expect(service.requestEmailChange).toHaveBeenCalledWith(
      PROFILE.id,
      { currentPassword: 'current-password', email: 'nuevo@example.com' },
      'access-token',
      'refresh-token',
    )
  })

  it('clears both session cookies after a password change', async () => {
    const service = createProfileService()
    const app = getApp(service)
    const token = await getCsrf(app)
    const response = await request(app)
      .put('/api/admin/profile/password')
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('Cookie', [...sessionCookies, `${CSRF_COOKIE_NAME}=${token}`])
      .set('X-CSRF-Token', token)
      .send({ currentPassword: 'current-password', newPassword: 'new-secure-password' })
      .expect(200)

    expect(getSetCookies(response).join(';')).toContain(`${ADMIN_ACCESS_COOKIE_NAME}=`)
    expect(getSetCookies(response).join(';')).toContain(`${ADMIN_REFRESH_COOKIE_NAME}=`)
    expect(service.updatePassword).toHaveBeenCalledWith(
      { currentPassword: 'current-password', newPassword: 'new-secure-password' },
      'access-token',
      'refresh-token',
    )
  })
})
