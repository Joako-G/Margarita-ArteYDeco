import { CategoryController } from '../controllers/categories.controller.js'
import { AdminAuthController } from '../controllers/admin-auth.controller.js'
import { AdminDashboardController } from '../controllers/admin-dashboard.controller.js'
import { AdminInventoryController } from '../controllers/admin-inventory.controller.js'
import { AdminProductController } from '../controllers/admin-products.controller.js'
import { CsrfController } from '../controllers/csrf.controller.js'
import { OrderController } from '../controllers/orders.controller.js'
import { ProductController } from '../controllers/products.controller.js'
import { PublicOrderController } from '../controllers/public-orders.controller.js'
import { SettingsController } from '../controllers/settings.controller.js'
import type { IApplicationDependencies } from '../config/dependencies.js'
import type { IEnv } from '../config/env.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IAdminAuthService } from '../services/admin-auth.service.js'
import type { IAdminDashboardService } from '../services/admin-dashboard.service.js'
import type { IAdminInventoryService } from '../services/admin-inventory.service.js'
import type { IAdminProductService } from '../services/admin-products.service.js'
import type { IProductService } from '../services/products.service.js'
import type { IPublicOrderService } from '../services/public-orders.service.js'
import { CsrfService } from '../services/csrf.service.js'
import type { IOrderService } from '../services/orders.service.js'
import type { ISettingsService } from '../services/settings.service.js'

export const TEST_ADMIN_ORIGIN = 'http://localhost:5173'

export const TEST_ENV: IEnv = {
  adminLoginRateLimitMax: 5,
  adminLoginRateLimitWindowMs: 900_000,
  adminSessionMaxAgeMs: 604_800_000,
  corsAllowedOrigins: [TEST_ADMIN_ORIGIN],
  nodeEnv: 'test',
  orderRateLimitMax: 10,
  orderRateLimitWindowMs: 60_000,
  port: 3000,
  publicCacheMaxAgeSeconds: 60,
  publicRateLimitMax: 120,
  publicRateLimitWindowMs: 60_000,
  recoveryBlockDurationMs: 1_800_000,
  recoveryCaptchaThreshold: 3,
  recoveryMaxAttempts: 5,
  recoveryWindowMs: 900_000,
  securityHmacSecret: 'test-only-hmac-secret-at-least-32-characters',
  storageSignedUrlRefreshSkewSeconds: 60,
  storageSignedUrlTtlSeconds: 3_600,
  supabaseSecretKey: 'test-only-server-key-not-for-production',
  supabaseUrl: 'https://test-project.supabase.co',
  trustProxy: false,
  turnstileAllowedHostnames: ['localhost'],
  turnstileSecretKey: 'test-turnstile-secret',
}

export function createTestDependencies(
  categoryService: ICategoryService,
  productService: IProductService,
  settingsService: ISettingsService,
  orderService: IOrderService = {
    create: async () => {
      throw new Error('Order service mock was not configured')
    },
  },
  publicOrderService: IPublicOrderService = {
    forget: async () => undefined,
    getByNumber: async () => {
      throw new Error('Public order service mock was not configured')
    },
    getRecent: async () => null,
    recover: async () => {
      throw new Error('Public order service mock was not configured')
    },
  },
  adminAuthService: IAdminAuthService = {
    authenticate: async () => {
      throw new Error('Admin auth service mock was not configured')
    },
    login: async () => {
      throw new Error('Admin auth service mock was not configured')
    },
    logout: async () => undefined,
  },
  adminDashboardService: IAdminDashboardService = {
    getSummary: async () => {
      throw new Error('Admin dashboard service mock was not configured')
    },
  },
  adminProductService: IAdminProductService = {
    create: async () => {
      throw new Error('Admin product service mock was not configured')
    },
    getById: async () => {
      throw new Error('Admin product service mock was not configured')
    },
    getCategoryOptions: async () => {
      throw new Error('Admin product service mock was not configured')
    },
    list: async () => {
      throw new Error('Admin product service mock was not configured')
    },
    setFeatured: async () => {
      throw new Error('Admin product service mock was not configured')
    },
    setPublication: async () => {
      throw new Error('Admin product service mock was not configured')
    },
    softDelete: async () => {
      throw new Error('Admin product service mock was not configured')
    },
    removeImage: async () => {
      throw new Error('Admin product service mock was not configured')
    },
    replaceImage: async () => {
      throw new Error('Admin product service mock was not configured')
    },
    update: async () => {
      throw new Error('Admin product service mock was not configured')
    },
  },
  adminInventoryService: IAdminInventoryService = {
    adjustStock: async () => {
      throw new Error('Admin inventory service mock was not configured')
    },
    getHistory: async () => {
      throw new Error('Admin inventory service mock was not configured')
    },
  },
): IApplicationDependencies {
  const csrfService = new CsrfService(TEST_ENV.securityHmacSecret)

  return {
    adminAuthController: new AdminAuthController(adminAuthService, TEST_ENV.adminSessionMaxAgeMs),
    adminAuthService,
    adminDashboardController: new AdminDashboardController(adminDashboardService),
    adminInventoryController: new AdminInventoryController(adminInventoryService),
    adminProductController: new AdminProductController(adminProductService),
    categoryController: new CategoryController(categoryService, 60),
    csrfController: new CsrfController(csrfService),
    csrfService,
    orderController: new OrderController(orderService),
    productController: new ProductController(productService, 60),
    publicOrderController: new PublicOrderController(publicOrderService),
    settingsController: new SettingsController(settingsService, 60),
  }
}
