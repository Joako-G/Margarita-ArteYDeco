import type { RouteObject } from 'react-router-dom'

import { routes } from '@/config/routes'
import { AdminLayout } from '@/layouts/AdminLayout/layout'
import { AuthLayout } from '@/layouts/AuthLayout/layout'
import { AdminDashboardPage } from '@/pages/Admin/Dashboard'
import { LoginPage } from '@/pages/Login'
import { ProtectedRoute } from '@/router/guards/ProtectedRoute'

export const adminRoutes: RouteObject[] = [
  {
    path: routes.adminLogin,
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: routes.admin,
        element: <AdminLayout />,
        children: [{ index: true, element: <AdminDashboardPage /> }],
      },
    ],
  },
]
