import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminDashboardService } from '../services/admin-dashboard.service.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IProductService } from '../services/products.service.js'
import type { ISettingsService } from '../services/settings.service.js'
import { AppError } from '../utils/app-error.js'
import { ADMIN_ACCESS_COOKIE_NAME } from '../utils/cookies.js'
import { createTestDependencies, TEST_ENV } from './test-helpers.js'

const PROFILE = {
  email: 'admin@example.com',
  fullName: 'Administradora',
  id: 'bd62774b-7863-4fb4-a041-60d9003a4432',
  isActive: true,
  role: 'administrator' as const,
}

const SUMMARY = {
  lowStockProducts: [],
  metrics: {
    activeProducts: 14,
    categories: 12,
    completedOrders: 0,
    customers: 1,
    lowStockProducts: 2,
    openOrders: 1,
    outOfStockProducts: 4,
  },
  recentOrders: [
    {
      createdAt: '2026-08-02T15:30:00.000Z',
      customerName: 'Ana Pérez',
      orderNumber: 'MAD-20260802-000001',
      paymentMethod: 'cash' as const,
      status: 'pending' as const,
      total: 12_500,
    },
  ],
}

function getApp(
  authService: IAdminAuthService,
  dashboardService: IAdminDashboardService,
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
      dashboardService,
    ),
  )
}

function createAuthorizedService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({ profile: PROFILE, tokensToSet: null }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

describe('admin dashboard API', () => {
  it('rejects requests without an authenticated administrative session', async () => {
    const authService = createAuthorizedService()
    vi.mocked(authService.authenticate).mockRejectedValue(
      new AppError(401, 'Tu sesión no es válida o venció', 'ADMIN_SESSION_REQUIRED'),
    )
    const dashboardService: IAdminDashboardService = {
      getSummary: vi.fn().mockResolvedValue(SUMMARY),
    }

    await request(getApp(authService, dashboardService))
      .get('/api/admin/dashboard')
      .expect(401)

    expect(dashboardService.getSummary).not.toHaveBeenCalled()
  })

  it('returns the private summary for an active administrator', async () => {
    const authService = createAuthorizedService()
    const dashboardService: IAdminDashboardService = {
      getSummary: vi.fn().mockResolvedValue(SUMMARY),
    }
    const response = await request(getApp(authService, dashboardService))
      .get('/api/admin/dashboard')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access-token`)
      .expect(200)

    expect(authService.authenticate).toHaveBeenCalledWith('access-token', null)
    expect(dashboardService.getSummary).toHaveBeenCalledOnce()
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body).toEqual({ success: true, data: SUMMARY })
    expect(JSON.stringify(response.body)).not.toContain('phone')
  })

  it('rejects an inactive administrative profile before reading dashboard data', async () => {
    const authService = createAuthorizedService()
    vi.mocked(authService.authenticate).mockResolvedValue({
      profile: { ...PROFILE, isActive: false },
      tokensToSet: null,
    })
    const dashboardService: IAdminDashboardService = {
      getSummary: vi.fn().mockResolvedValue(SUMMARY),
    }

    await request(getApp(authService, dashboardService))
      .get('/api/admin/dashboard')
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access-token`)
      .expect(403)

    expect(dashboardService.getSummary).not.toHaveBeenCalled()
  })
})
