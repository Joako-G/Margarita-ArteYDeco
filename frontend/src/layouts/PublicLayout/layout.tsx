import { lazy, Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { CartToast } from '@/features/cart/components/CartToast'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import '@/features/landing/landing.css'
import './styles.css'

const CartDrawer = lazy(async () => {
  const module = await import('@/features/cart/components/CartDrawer')

  return { default: module.CartDrawer }
})

export function PublicLayout() {
  return (
    <>
      <a className="public-layout__skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <SiteHeader />
      <Outlet />
      <SiteFooter />
      <CartToast />
      <Suspense fallback={null}>
        <CartDrawer />
      </Suspense>
    </>
  )
}
