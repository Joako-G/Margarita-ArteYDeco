import { createBrowserRouter } from 'react-router-dom'

import { adminRoutes } from '@/router/admin.routes'
import { publicRoutes } from '@/router/public.routes'
import { RouteScrollManager } from '@/router/RouteScrollManager'
import { RouteLoadingFallback } from '@/router/RouteLoadingFallback'
import { RouteErrorBoundary } from '@/router/RouteErrorBoundary'

const loadNotFoundPage = async () => ({
  Component: (await import('@/pages/NotFound')).NotFoundPage,
})

export const router = createBrowserRouter([
  {
    element: <RouteScrollManager />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteLoadingFallback />,
    children: [
      ...publicRoutes,
      ...adminRoutes,
      {
        path: '*',
        lazy: loadNotFoundPage,
      },
    ],
  },
])
