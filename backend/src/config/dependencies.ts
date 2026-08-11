import type { Logger } from 'pino'

import { CategoryController } from '../controllers/categories.controller.js'
import { AdminCategoryController } from '../controllers/admin-categories.controller.js'
import { AdminCustomerController } from '../controllers/admin-customers.controller.js'
import { AdminAuthController } from '../controllers/admin-auth.controller.js'
import { AdminDashboardController } from '../controllers/admin-dashboard.controller.js'
import { AdminInventoryController } from '../controllers/admin-inventory.controller.js'
import { AdminOrderController } from '../controllers/admin-orders.controller.js'
import { AdminProductController } from '../controllers/admin-products.controller.js'
import { AdminProfileController } from '../controllers/admin-profile.controller.js'
import { AdminSettingsController } from '../controllers/admin-settings.controller.js'
import { CsrfController } from '../controllers/csrf.controller.js'
import { OrderController } from '../controllers/orders.controller.js'
import { ProductController } from '../controllers/products.controller.js'
import { PublicOrderController } from '../controllers/public-orders.controller.js'
import { SettingsController } from '../controllers/settings.controller.js'
import { SitemapController } from '../controllers/sitemap.controller.js'
import { CategoryRepository } from '../repositories/categories.repository.js'
import { AdminCategoryRepository } from '../repositories/admin-categories.repository.js'
import { AdminCustomerRepository } from '../repositories/admin-customers.repository.js'
import { AdminProfileRepository } from '../repositories/admin-profiles.repository.js'
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js'
import { AdminInventoryRepository } from '../repositories/admin-inventory.repository.js'
import { AdminOrderRepository } from '../repositories/admin-orders.repository.js'
import { AdminProductRepository } from '../repositories/admin-products.repository.js'
import { AdminSettingsRepository } from '../repositories/admin-settings.repository.js'
import { GuestSessionRepository } from '../repositories/guest-sessions.repository.js'
import { OrderRepository } from '../repositories/orders.repository.js'
import { ProductRepository } from '../repositories/products.repository.js'
import { RecoveryRepository } from '../repositories/recovery.repository.js'
import { SettingsRepository } from '../repositories/settings.repository.js'
import { StorageRepository } from '../repositories/storage.repository.js'
import { CategoryService } from '../services/categories.service.js'
import { AdminCategoryService } from '../services/admin-categories.service.js'
import { AdminCustomerService } from '../services/admin-customers.service.js'
import { SupabaseAdminAuthProvider } from '../services/admin-auth.provider.js'
import { AdminAuthService, type IAdminAuthService } from '../services/admin-auth.service.js'
import { AdminDashboardService } from '../services/admin-dashboard.service.js'
import { AdminInventoryService } from '../services/admin-inventory.service.js'
import { AdminOrderService } from '../services/admin-orders.service.js'
import { AdminProductService } from '../services/admin-products.service.js'
import { AdminProfileService, type IAdminProfileService } from '../services/admin-profile.service.js'
import { AdminSettingsService } from '../services/admin-settings.service.js'
import { CsrfService, type ICsrfService } from '../services/csrf.service.js'
import { GuestSessionService } from '../services/guest-sessions.service.js'
import { OrderService } from '../services/orders.service.js'
import { OrderConfirmationService } from '../services/order-confirmation.service.js'
import { ProductService } from '../services/products.service.js'
import { PublicOrderService } from '../services/public-orders.service.js'
import { RecoveryProtectionService } from '../services/recovery-protection.service.js'
import { SettingsService } from '../services/settings.service.js'
import { SitemapService } from '../services/sitemap.service.js'
import { StorageService } from '../services/storage.service.js'
import { TurnstileService } from '../services/turnstile.service.js'
import { CatalogImageService } from '../services/catalog-image.service.js'
import type { IEnv } from './env.js'
import { createSupabaseClient } from './supabase.js'

export interface IApplicationDependencies {
  adminAuthController: AdminAuthController
  adminAuthService: IAdminAuthService
  adminCategoryController: AdminCategoryController
  adminCustomerController: AdminCustomerController
  adminDashboardController: AdminDashboardController
  adminInventoryController: AdminInventoryController
  adminOrderController: AdminOrderController
  adminProductController: AdminProductController
  adminProfileController: AdminProfileController
  adminProfileService: IAdminProfileService
  adminSettingsController: AdminSettingsController
  categoryController: CategoryController
  csrfController: CsrfController
  csrfService: ICsrfService
  orderController: OrderController
  productController: ProductController
  publicOrderController: PublicOrderController
  settingsController: SettingsController
  sitemapController: SitemapController
}

export function createApplicationDependencies(
  env: IEnv,
  logger: Logger,
): IApplicationDependencies {
  const supabase = createSupabaseClient(env)
  const adminProfileRepository = new AdminProfileRepository(supabase)
  const adminAuthProvider = new SupabaseAdminAuthProvider(env.supabaseUrl, env.supabaseSecretKey)
  const adminAuthService = new AdminAuthService(
    adminAuthProvider,
    adminProfileRepository,
  )
  const adminProfileService = new AdminProfileService(
    adminProfileRepository,
    adminAuthProvider,
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
  const catalogImageService = new CatalogImageService()
  const adminProductService = new AdminProductService(
    new AdminProductRepository(supabase),
    storageService,
    logger,
    catalogImageService,
  )
  const adminCategoryService = new AdminCategoryService(
    new AdminCategoryRepository(supabase),
    storageService,
    logger,
    catalogImageService,
  )
  const adminCustomerService = new AdminCustomerService(
    new AdminCustomerRepository(supabase),
    logger,
  )
  const settingsRepository = new SettingsRepository(supabase)
  const adminSettingsService = new AdminSettingsService(
    new AdminSettingsRepository(supabase),
    storageService,
    logger,
  )
  const adminOrderService = new AdminOrderService(
    new AdminOrderRepository(supabase),
    settingsRepository,
    logger,
  )
  const settingsService = new SettingsService(settingsRepository, storageService)
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
    adminCategoryController: new AdminCategoryController(adminCategoryService),
    adminCustomerController: new AdminCustomerController(adminCustomerService),
    adminDashboardController: new AdminDashboardController(adminDashboardService),
    adminInventoryController: new AdminInventoryController(adminInventoryService),
    adminOrderController: new AdminOrderController(adminOrderService),
    adminProductController: new AdminProductController(adminProductService),
    adminProfileController: new AdminProfileController(adminProfileService),
    adminProfileService,
    adminSettingsController: new AdminSettingsController(adminSettingsService),
    categoryController: new CategoryController(categoryService, env.publicCacheMaxAgeSeconds),
    csrfController: new CsrfController(csrfService),
    csrfService,
    orderController: new OrderController(orderService),
    productController: new ProductController(productService, env.publicCacheMaxAgeSeconds),
    publicOrderController: new PublicOrderController(publicOrderService),
    settingsController: new SettingsController(settingsService, env.publicCacheMaxAgeSeconds),
    sitemapController: new SitemapController(
      new SitemapService(categoryService, env.publicSiteUrl),
      env.publicCacheMaxAgeSeconds,
    ),
  }
}
