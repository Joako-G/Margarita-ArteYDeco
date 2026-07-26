import { createBrowserRouter } from 'react-router-dom'

import { adminRoutes } from '@/router/admin.routes'
import { publicRoutes } from '@/router/public.routes'
import { NotFoundPage } from '@/pages/NotFound'

export const router = createBrowserRouter([
  ...publicRoutes,
  ...adminRoutes,
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
