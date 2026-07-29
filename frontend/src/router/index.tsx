import { createBrowserRouter } from 'react-router-dom'

import { adminRoutes } from '@/router/admin.routes'
import { publicRoutes } from '@/router/public.routes'
import { NotFoundPage } from '@/pages/NotFound'
import { RouteScrollManager } from '@/router/RouteScrollManager'

export const router = createBrowserRouter([
  {
    element: <RouteScrollManager />,
    children: [
      ...publicRoutes,
      ...adminRoutes,
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
