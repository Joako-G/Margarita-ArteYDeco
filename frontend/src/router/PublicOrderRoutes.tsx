import { lazy, Suspense } from 'react'

import { Spinner } from '@/shared/components'

const OrderPage = lazy(async () => {
  const module = await import('@/pages/Order')

  return { default: module.OrderPage }
})

const RecoverOrderPage = lazy(async () => {
  const module = await import('@/pages/RecoverOrder')

  return { default: module.RecoverOrderPage }
})

function PublicPageFallback({ label }: { label: string }) {
  return (
    <main id="main-content">
      <Spinner label={label} />
    </main>
  )
}

export function OrderRoute() {
  return (
    <Suspense fallback={<PublicPageFallback label="Consultando pedido" />}>
      <OrderPage />
    </Suspense>
  )
}

export function RecoverOrderRoute() {
  return (
    <Suspense fallback={<PublicPageFallback label="Preparando recuperación" />}>
      <RecoverOrderPage />
    </Suspense>
  )
}
