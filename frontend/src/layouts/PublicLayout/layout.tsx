import { lazy, Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { CartToast } from '@/features/cart/components/CartToast'
import { CartAvailabilitySync } from '@/features/cart'
import { useCartStore } from '@/features/cart'
import { FloatingWhatsApp } from '@/features/contact'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import './styles.css'

const CartDrawer = lazy(async () => {
  const module = await import('@/features/cart/components/CartDrawer')

  return { default: module.CartDrawer }
})

export function PublicLayout() {
  const isCartOpen = useCartStore((state) => state.isCartOpen)

  return (
    <>
      <a className="public-layout__skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <CartAvailabilitySync />
      <SiteHeader />
      <Outlet />
      <SiteFooter />
      <CartToast />
      <FloatingWhatsApp />
      {isCartOpen ? (
        <Suspense fallback={null}>
          <CartDrawer />
        </Suspense>
      ) : null}
    </>
  )
}
