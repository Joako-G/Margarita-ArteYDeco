import type { RouteObject } from 'react-router-dom'

import { PublicLayout } from '@/layouts/PublicLayout/layout'
import { Catalog } from '@/pages/Catalog'
import { HomePage } from '@/pages/Home'

export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'productos',
        element: <Catalog />,
      },
      {
        path: 'categoria/:slug',
        element: <Catalog />,
      },
    ],
  },
]
