import type { Logger } from 'pino'

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
import { CategoryRepository } from '../repositories/categories.repository.js'
import { AdminProfileRepository } from '../repositories/admin-profiles.repository.js'
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js'
import { AdminInventoryRepository } from '../repositories/admin-inventory.repository.js'
import { AdminProductRepository } from '../repositories/admin-products.repository.js'
import { GuestSessionRepository } from '../repositories/guest-sessions.repository.js'
import { OrderRepository } from '../repositories/orders.repository.js'
import { ProductRepository } from '../repositories/products.repository.js'
import { RecoveryRepository } from '../repositories/recovery.repository.js'
import { SettingsRepository } from '../repositories/settings.repository.js'
import { StorageRepository } from '../repositories/storage.repository.js'
import { CategoryService } from '../services/categories.service.js'
import { SupabaseAdminAuthProvider } from '../services/admin-auth.provider.js'
import { AdminAuthService, type IAdminAuthService } from '../services/admin-auth.service.js'
import { AdminDashboardService } from '../services/admin-dashboard.service.js'
import { AdminInventoryService } from '../services/admin-inventory.service.js'
import { AdminProductService } from '../services/admin-products.service.js'
import { CsrfService, type ICsrfService } from '../services/csrf.service.js'
import { GuestSessionService } from '../services/guest-sessions.service.js'
import { OrderService } from '../services/orders.service.js'
import { OrderConfirmationService } from '../services/order-confirmation.service.js'
import { ProductService } from '../services/products.service.js'
import { PublicOrderService } from '../services/public-orders.service.js'
import { RecoveryProtectionService } from '../services/recovery-protection.service.js'
import { SettingsService } from '../services/settings.service.js'
import { StorageService } from '../services/storage.service.js'
import { TurnstileService } from '../services/turnstile.service.js'
import type { IEnv } from './env.js'
import { createSupabaseClient } from './supabase.js'

export interface IApplicationDependencies {
  adminAuthController: AdminAuthController
  adminAuthService: IAdminAuthService
  adminDashboardController: AdminDashboardController
  adminInventoryController: AdminInventoryController
  adminProductController: AdminProductController
  categoryController: CategoryController
  csrfController: CsrfController
  csrfService: ICsrfService
  orderController: OrderController
  productController: ProductController
  publicOrderController: PublicOrderController
  settingsController: SettingsController
}

export function createApplicationDependencies(
  env: IEnv,
  logger: Logger,
): IApplicationDependencies {
  const supabase = createSupabaseClient(env)
  const adminAuthService = new AdminAuthService(
    new SupabaseAdminAuthProvider(env.supabaseUrl, env.supabaseSecretKey),
    new AdminProfileRepository(supabase),
  )
  const adminDashboardService = new AdminDashboardService(
    new AdminDashboardRepository(supabase),
  )
  const adminInventoryService = new AdminInventoryService(
    new AdminInventoryRepository(supabase),
  )
  const storageRepository = new StorageRepository(supabase)
  const storageService = new StorageService(
    storageRepository,
    env.storageSignedUrlTtlSeconds,
    env.storageSignedUrlRefreshSkewSeconds,
    logger,
  )
  const categoryService = new CategoryService(new CategoryRepository(supabase), storageService)
  const productService = new ProductService(new ProductRepository(supabase), storageService)
  const adminProductService = new AdminProductService(
    new AdminProductRepository(supabase),
    storageService,
    logger,
  )
  const settingsService = new SettingsService(new SettingsRepository(supabase), storageService)
  const csrfService = new CsrfService(env.securityHmacSecret)
  const guestSessionService = new GuestSessionService(new GuestSessionRepository(supabase))
  const orderRepository = new OrderRepository(supabase)
  const confirmationService = new OrderConfirmationService(orderRepository)
  const orderService = new OrderService(
    orderRepository,
    guestSessionService,
    confirmationService,
    logger,
  )
  const publicOrderService = new PublicOrderService(
    orderRepository,
    new RecoveryRepository(supabase),
    guestSessionService,
    confirmationService,
    new RecoveryProtectionService(env.securityHmacSecret),
    new TurnstileService(
      env.turnstileSecretKey,
      env.turnstileAllowedHostnames,
      logger,
    ),
    {
      blockDurationMs: env.recoveryBlockDurationMs,
      captchaThreshold: env.recoveryCaptchaThreshold,
      maxAttempts: env.recoveryMaxAttempts,
      windowMs: env.recoveryWindowMs,
    },
  )

  return {
    adminAuthController: new AdminAuthController(adminAuthService, env.adminSessionMaxAgeMs),
    adminAuthService,
    adminDashboardController: new AdminDashboardController(adminDashboardService),
    adminInventoryController: new AdminInventoryController(adminInventoryService),
    adminProductController: new AdminProductController(adminProductService),
    categoryController: new CategoryController(categoryService, env.publicCacheMaxAgeSeconds),
    csrfController: new CsrfController(csrfService),
    csrfService,
    orderController: new OrderController(orderService),
    productController: new ProductController(productService, env.publicCacheMaxAgeSeconds),
    publicOrderController: new PublicOrderController(publicOrderService),
    settingsController: new SettingsController(settingsService, env.publicCacheMaxAgeSeconds),
  }
}
