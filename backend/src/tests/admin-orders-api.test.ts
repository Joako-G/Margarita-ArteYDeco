import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminOrderService } from '../services/admin-orders.service.js'
import type { IAdminOrderDetailDto } from '../types/admin-orders.js'
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
const ORDER_ID = '3a2b9148-7dbf-4b88-a47f-296205f5e4de'
const UPDATED_AT = '2026-08-03T12:00:00.000Z'
const ORDER: IAdminOrderDetailDto = {
  availableActions: ['confirmPayment'],
  business: {
    address: 'Av. Siempre Viva 123',
    businessHours: 'Lunes a viernes de 9 a 18 h',
    businessName: 'Margaritas Arte & Deco',
    mapsUrl: 'https://maps.google.com/example',
  },
  canCancel: true,
  createdAt: UPDATED_AT,
  customer: { firstName: 'Ana', lastName: 'Pérez', phone: '+54 9 11 5555-1234' },
  discount: 1200,
  id: ORDER_ID,
  itemCount: 1,
  items: [{ productName: 'Pinceles', quantity: 2, subtotal: 10800, unitPrice: 5400 }],
  notes: '',
  orderNumber: 'MAD-20260803-000001',
  paymentMethod: 'bank_transfer',
  paymentStatus: 'pending',
  pickedUpAt: null,
  requiresManualRefundOnCancel: false,
  status: 'payment_pending',
  subtotal: 12000,
  total: 10800,
  updatedAt: UPDATED_AT,
  whatsappPhone: '5491155550000',
}

function createAuthService(): IAdminAuthService {
  return {
    authenticate: vi.fn().mockResolvedValue({ profile: PROFILE, tokensToSet: null }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function createOrderService(): IAdminOrderService {
  return {
    cancel: vi.fn().mockResolvedValue({ order: ORDER, stockRestored: true }),
    executeAction: vi.fn().mockResolvedValue(ORDER),
    getById: vi.fn().mockResolvedValue(ORDER),
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
  }
}

function getApp(
  adminOrderService: IAdminOrderService,
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
      adminOrderService,
    ),
  )
}

async function getCsrf(app: Express): Promise<string> {
  const response = await request(app).get('/api/admin/auth/csrf-token').expect(200)
  return String(response.body.data.csrfToken)
}

describe('admin orders API', () => {
  it('requires an active administrative session', async () => {
    const authService = createAuthService()
    vi.mocked(authService.authenticate).mockRejectedValue(
      new AppError(401, 'Tu sesión no es válida o venció', 'ADMIN_SESSION_REQUIRED'),
    )
    const service = createOrderService()

    await request(getApp(service, authService)).get('/api/admin/orders').expect(401)
    expect(service.list).not.toHaveBeenCalled()
  })

  it('validates filters and returns a private paginated contract', async () => {
    const service = createOrderService()
    const response = await request(getApp(service))
      .get('/api/admin/orders')
      .query({
        page: 2,
        pageSize: 20,
        paymentMethod: 'bank_transfer',
        paymentStatus: 'pending',
        sort: 'oldest',
        status: 'payment_pending',
      })
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access`)
      .expect(200)

    expect(service.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending',
      sort: 'oldest',
      status: 'payment_pending',
    })
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('executes only validated actions with Origin and CSRF', async () => {
    const service = createOrderService()
    const app = getApp(service)
    const token = await getCsrf(app)
    const payload = { action: 'confirmPayment', expectedUpdatedAt: UPDATED_AT }

    await request(app)
      .post(`/api/admin/orders/${ORDER_ID}/actions`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(payload)
      .expect(200)

    expect(service.executeAction).toHaveBeenCalledWith(ORDER_ID, payload, PROFILE.id)
  })

  it('requires a cancellation reason and explicit refund confirmation value', async () => {
    const service = createOrderService()
    const app = getApp(service)
    const token = await getCsrf(app)

    await request(app)
      .post(`/api/admin/orders/${ORDER_ID}/cancellation`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send({ expectedUpdatedAt: UPDATED_AT, reason: 'No' })
      .expect(400)

    expect(service.cancel).not.toHaveBeenCalled()
  })

  it('passes the authenticated administrator to atomic cancellation', async () => {
    const service = createOrderService()
    const app = getApp(service)
    const token = await getCsrf(app)
    const payload = {
      confirmManualRefund: true,
      expectedUpdatedAt: UPDATED_AT,
      reason: 'Solicitud del cliente',
    }

    await request(app)
      .post(`/api/admin/orders/${ORDER_ID}/cancellation`)
      .set('Cookie', `${ADMIN_ACCESS_COOKIE_NAME}=access; ${CSRF_COOKIE_NAME}=${token}`)
      .set('Origin', TEST_ADMIN_ORIGIN)
      .set('X-CSRF-Token', token)
      .send(payload)
      .expect(200)

    expect(service.cancel).toHaveBeenCalledWith(ORDER_ID, payload, PROFILE.id)
  })
})
