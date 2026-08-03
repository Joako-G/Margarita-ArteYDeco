import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { AdminAuthController } from '../controllers/admin-auth.controller.js'
import { createLogger } from '../config/logger.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IProductService } from '../services/products.service.js'
import type { ISettingsService } from '../services/settings.service.js'
import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from '../utils/cookies.js'
import { createTestDependencies, TEST_ENV } from './test-helpers.js'

const PROFILE = {
  email: 'admin@example.com',
  fullName: 'Administradora',
  id: 'bd62774b-7863-4fb4-a041-60d9003a4432',
  isActive: true,
  role: 'administrator' as const,
}

const TOKENS = {
  accessToken: 'access-token',
  expiresAt: new Date('2026-08-02T20:00:00.000Z'),
  refreshToken: 'refresh-token',
}

function createAuthService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({ profile: PROFILE, tokensToSet: null }),
    login: vi.fn().mockResolvedValue({ profile: PROFILE, tokens: TOKENS }),
    logout: vi.fn().mockResolvedValue(undefined),
  }
}

function getApp(authService: IAdminAuthService): Express {
  const categoryService: ICategoryService = { listPublic: vi.fn().mockResolvedValue([]) }
  const productService: IProductService = { listPublic: vi.fn().mockResolvedValue([]) }
  const settingsService: ISettingsService = { getPublic: vi.fn() }
  const dependencies = createTestDependencies(categoryService, productService, settingsService)

  return createApp(TEST_ENV, createLogger(TEST_ENV), {
    ...dependencies,
    adminAuthController: new AdminAuthController(authService, TEST_ENV.adminSessionMaxAgeMs),
    adminAuthService: authService,
  })
}

function getSetCookies(response: request.Response): string[] {
  const value = response.headers['set-cookie']
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

async function getCsrf(app: Express): Promise<string> {
  const response = await request(app).get('/api/admin/auth/csrf-token').expect(200)
  return response.body.data.csrfToken as string
}

describe('admin auth API', () => {
  it('requires an allowed origin and a valid CSRF token to log in', async () => {
    const app = getApp(createAuthService())
    const token = await getCsrf(app)

    await request(app)
      .post('/api/admin/auth/login')
      .set('Cookie', `${CSRF_COOKIE_NAME}=${token}`)
      .set('X-CSRF-Token', token)
      .send({ email: PROFILE.email, password: 'valid-password' })
      .expect(403)
  })

  it('keeps Supabase credentials only in secure HttpOnly cookies', async () => {
    const app = getApp(createAuthService())
    const token = await getCsrf(app)
    const response = await request(app)
      .post('/api/admin/auth/login')
      .set('Origin', TEST_ENV.corsAllowedOrigins[0] ?? '')
      .set('Cookie', `${CSRF_COOKIE_NAME}=${token}`)
      .set('X-CSRF-Token', token)
      .send({ email: PROFILE.email, password: 'valid-password' })
      .expect(200)

    const cookies = getSetCookies(response)
    const accessCookie = cookies.find((cookie) => cookie.startsWith(ADMIN_ACCESS_COOKIE_NAME)) ?? ''
    const refreshCookie = cookies.find((cookie) => cookie.startsWith(ADMIN_REFRESH_COOKIE_NAME)) ?? ''

    expect(response.body.data).toEqual({
      authenticated: true,
      profile: { email: PROFILE.email, fullName: PROFILE.fullName, role: PROFILE.role },
    })
    expect(JSON.stringify(response.body)).not.toContain('access-token')
    expect(JSON.stringify(response.body)).not.toContain('refresh-token')
    for (const cookie of [accessCookie, refreshCookie]) {
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('Secure')
      expect(cookie).toContain('SameSite=Lax')
      expect(cookie).toContain('Path=/')
    }
  })

  it('restores the authorized database profile from the session cookies', async () => {
    const service = createAuthService()
    const response = await request(getApp(service))
      .get('/api/admin/auth/session')
      .set('Cookie', [
        `${ADMIN_ACCESS_COOKIE_NAME}=access-token`,
        `${ADMIN_REFRESH_COOKIE_NAME}=refresh-token`,
      ])
      .expect(200)

    expect(service.authenticate).toHaveBeenCalledWith('access-token', 'refresh-token')
    expect(response.body.data.profile).toEqual({
      email: PROFILE.email,
      fullName: PROFILE.fullName,
      role: PROFILE.role,
    })
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('rotates cookies when the backend refreshes an expired access token', async () => {
    const service = createAuthService()
    vi.mocked(service.authenticate).mockResolvedValue({ profile: PROFILE, tokensToSet: TOKENS })
    const response = await request(getApp(service))
      .get('/api/admin/auth/session')
      .set('Cookie', `${ADMIN_REFRESH_COOKIE_NAME}=old-refresh-token`)
      .expect(200)

    expect(getSetCookies(response).some((cookie) => (
      cookie.startsWith(`${ADMIN_REFRESH_COOKIE_NAME}=refresh-token`)
    ))).toBe(true)
  })

  it('clears both cookies on logout without returning credentials', async () => {
    const service = createAuthService()
    const app = getApp(service)
    const token = await getCsrf(app)
    const response = await request(app)
      .post('/api/admin/auth/logout')
      .set('Origin', TEST_ENV.corsAllowedOrigins[0] ?? '')
      .set('Cookie', [
        `${CSRF_COOKIE_NAME}=${token}`,
        `${ADMIN_ACCESS_COOKIE_NAME}=access-token`,
        `${ADMIN_REFRESH_COOKIE_NAME}=refresh-token`,
      ])
      .set('X-CSRF-Token', token)
      .expect(200)

    expect(service.logout).toHaveBeenCalledWith('access-token', 'refresh-token')
    const clearedCookies = getSetCookies(response).filter((cookie) => cookie.includes('Expires='))
    expect(clearedCookies.some((cookie) => cookie.startsWith(ADMIN_ACCESS_COOKIE_NAME))).toBe(true)
    expect(clearedCookies.some((cookie) => cookie.startsWith(ADMIN_REFRESH_COOKIE_NAME))).toBe(true)
    expect(response.body).toEqual({ success: true, data: { authenticated: false } })
  })
})
