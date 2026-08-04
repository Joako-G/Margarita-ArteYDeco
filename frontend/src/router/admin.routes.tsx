import type { RouteObject } from 'react-router-dom'

import { routes } from '@/config/routes'

const loadAdminLayout = async () => ({
  Component: (await import('@/layouts/AdminLayout/layout')).AdminLayout,
})
const loadAuthLayout = async () => ({
  Component: (await import('@/layouts/AuthLayout/layout')).AuthLayout,
})
const loadProtectedRoute = async () => ({
  Component: (await import('@/router/guards/ProtectedRoute')).ProtectedRoute,
})
const loadLoginPage = async () => ({
  Component: (await import('@/pages/Login')).LoginPage,
})
const loadDashboardPage = async () => ({
  Component: (await import('@/pages/Admin/Dashboard')).AdminDashboardPage,
})
const loadProductsPage = async () => ({
  Component: (await import('@/pages/Admin/Products')).AdminProductsPage,
})
const loadProductFormPage = async () => ({
  Component: (await import('@/pages/Admin/Products/Form')).AdminProductFormPage,
})
const loadCategoriesPage = async () => ({
  Component: (await import('@/pages/Admin/Categories')).AdminCategoriesPage,
})
const loadCategoryFormPage = async () => ({
  Component: (await import('@/pages/Admin/Categories/Form')).AdminCategoryFormPage,
})
const loadOrdersPage = async () => ({
  Component: (await import('@/pages/Admin/Orders')).AdminOrdersPage,
})
const loadOrderDetailPage = async () => ({
  Component: (await import('@/pages/Admin/Orders/Detail')).AdminOrderDetailPage,
})
const loadCustomersPage = async () => ({
  Component: (await import('@/pages/Admin/Customers')).AdminCustomersPage,
})
const loadCustomerDetailPage = async () => ({
  Component: (await import('@/pages/Admin/Customers/Detail')).AdminCustomerDetailPage,
})
const loadSettingsPage = async () => ({
  Component: (await import('@/pages/Admin/Settings')).AdminSettingsPage,
})
const loadProfilePage = async () => ({
  Component: (await import('@/pages/Admin/Profile')).AdminProfilePage,
})

export const adminRoutes: RouteObject[] = [
  {
    path: routes.adminLogin,
    lazy: loadAuthLayout,
    children: [{ index: true, lazy: loadLoginPage }],
  },
  {
    lazy: loadProtectedRoute,
    children: [
      {
        path: routes.admin,
        lazy: loadAdminLayout,
        children: [
          { index: true, lazy: loadDashboardPage },
          { path: 'productos', lazy: loadProductsPage },
          { path: 'productos/nuevo', lazy: loadProductFormPage },
          { path: 'productos/:productId/editar', lazy: loadProductFormPage },
          { path: 'categorias', lazy: loadCategoriesPage },
          { path: 'categorias/nueva', lazy: loadCategoryFormPage },
          { path: 'categorias/:categoryId/editar', lazy: loadCategoryFormPage },
          { path: 'pedidos', lazy: loadOrdersPage },
          { path: 'pedidos/:orderId', lazy: loadOrderDetailPage },
          { path: 'clientes', lazy: loadCustomersPage },
          { path: 'clientes/:customerId', lazy: loadCustomerDetailPage },
          { path: 'configuracion', lazy: loadSettingsPage },
          { path: 'perfil', lazy: loadProfilePage },
        ],
      },
    ],
  },
]
