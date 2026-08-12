import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminSettingsService } from '../services/admin-settings.service.js'
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
const UPDATED_AT = '2026-08-03T12:00:00.000Z'
const SETTINGS = {
  address: 'Av. Siempre Viva 123',
  bankName: 'Banco Nación',
  businessHours: 'Lunes a viernes de 9 a 18',
  businessName: 'Margaritas Arte & Deco',
  facebook: null,
  instagram: null,
  logoUrl: null,
  lowStockThreshold: 5,
  mapsUrl: 'https://maps.google.com/?q=local',
  tiktok: 'https://tiktok.com/@margaritas',
  transferAlias: 'MARGARITAS.ARTE',
  transferCbu: '1234567890123456789012',
  transferDiscount: 10,
  updatedAt: UPDATED_AT,
  whatsapp: '5491155551234',
}

function createAuthService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({ profile: PROFILE, tokensToSet: null }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function createSettingsService(): IAdminSettingsService {
  return {
    get: vi.fn().mockResolvedValue(SETTINGS),
    removeLogo: vi.fn().mockResolvedValue(SETTINGS),
    replaceLogo: vi.fn().mockResolvedValue(SETTINGS),
    update: vi.fn().mockResolvedValue(SETTINGS),
  }
}

function getApp(
  adminSettingsService: IAdminSettingsService,
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
      undefined,
      adminSettingsService,
    ),
  )
}

async function getCsrf(app: Express): Promise<string> {
  const response = await request(app).get('/api/admin/auth/csrf-token').expect(200)
  return String(response.body.data.csrfToken)
}

describe('admin settings API', () => {
  it('requires an active administrative session', async () => {
    const authService = createAuthService()
    vi.mocked(authService.authenticate).mockRejectedValue(
      new AppError(401, 'Tu sesión no es válida o venció', 'ADMIN_SESSION_REQUIRED'),
    )
    const service = createSettingsService()

    await request(getApp(service, authService)).get('/api/admin/settings').expect(401)
    expect(service.get).not.toHaveBeenCalled()
  })

  it('returns the private singleton with no-store headers', async () => {
    const service = createSettingsService()
    const response = await request(getApp(service))
      .get('/api/admin/settings')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access`)
      .expect(200)

    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body.data).toMatchObject({ bankName: 'Banco Nación', logoUrl: null })
    expect(response.body.data).not.toHaveProperty('logoPath')
  })

  it('normalizes sensitive operational values behind Origin and CSRF', async () => {
    const service = createSettingsService()
    const app = getApp(service)
    const token = await getCsrf(app)
    const payload = {
      ...SETTINGS,
      expectedUpdatedAt: UPDATED_AT,
      transferCbu: '1234 5678 9012 3456 7890 12',
      whatsapp: '+54 9 11 5555-1234',
    }
    delete (payload as Partial<typeof payload>).logoUrl
    delete (payload as Partial<typeof payload>).updatedAt

    await request(app)
      .put('/api/admin/settings')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(payload)
      .expect(200)

    expect(service.update).toHaveBeenCalledWith(expect.objectContaining({
      transferCbu: '1234567890123456789012',
      whatsapp: '5491155551234',
    }), PROFILE.id)
  })

  it('validates the real logo signature before replacing it', async () => {
    const service = createSettingsService()
    const app = getApp(service)
    const token = await getCsrf(app)

    await request(app)
      .put('/api/admin/settings/logo')
      .query({ expectedUpdatedAt: UPDATED_AT })
      .set('Content-Type', 'image/png')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(Buffer.from('not-a-png'))
      .expect(400)

    expect(service.replaceLogo).not.toHaveBeenCalled()
  })

  it('removes the configured logo only with explicit concurrency data', async () => {
    const service = createSettingsService()
    const app = getApp(service)
    const token = await getCsrf(app)

    await request(app)
      .delete('/api/admin/settings/logo')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send({ expectedUpdatedAt: UPDATED_AT })
      .expect(200)

    expect(service.removeLogo).toHaveBeenCalledWith(UPDATED_AT, PROFILE.id)
  })
})
