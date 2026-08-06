import type { RouteObject } from 'react-router-dom'

const shouldPreloadHome = window.location.pathname === '/'
const publicLayoutPreload = shouldPreloadHome ? import('@/layouts/PublicLayout/layout') : undefined
const homePagePreload = shouldPreloadHome ? import('@/pages/Home') : undefined

const loadPublicLayout = async () => ({
  Component: (await (publicLayoutPreload ?? import('@/layouts/PublicLayout/layout'))).PublicLayout,
})
const loadHomePage = async () => ({
  Component: (await (homePagePreload ?? import('@/pages/Home'))).HomePage,
})
const loadCatalogPage = async () => ({
  Component: (await import('@/pages/Catalog')).Catalog,
})
const loadCheckoutRoute = async () => ({
  Component: (await import('@/router/CheckoutRoute')).CheckoutRoute,
})
const loadOrderRoute = async () => ({
  Component: (await import('@/router/PublicOrderRoutes')).OrderRoute,
})
const loadRecoverOrderRoute = async () => ({
  Component: (await import('@/router/PublicOrderRoutes')).RecoverOrderRoute,
})
const loadPrivacyPolicyPage = async () => ({
  Component: (await import('@/pages/Legal/PrivacyPolicy')).PrivacyPolicyPage,
})
const loadTermsAndConditionsPage = async () => ({
  Component: (await import('@/pages/Legal/TermsAndConditions')).TermsAndConditionsPage,
})

export const publicRoutes: RouteObject[] = [
  {
    lazy: loadPublicLayout,
    children: [
      {
        index: true,
        lazy: loadHomePage,
      },
      {
        path: 'productos',
        lazy: loadCatalogPage,
      },
      {
        path: 'categoria/:slug',
        lazy: loadCatalogPage,
      },
      {
        path: 'checkout',
        lazy: loadCheckoutRoute,
      },
      {
        path: 'pedido/:orderNumber',
        lazy: loadOrderRoute,
      },
      {
        path: 'recuperar-pedido',
        lazy: loadRecoverOrderRoute,
      },
      {
        path: 'politica-de-privacidad',
        lazy: loadPrivacyPolicyPage,
      },
      {
        path: 'terminos-y-condiciones',
        lazy: loadTermsAndConditionsPage,
      },
    ],
  },
]
