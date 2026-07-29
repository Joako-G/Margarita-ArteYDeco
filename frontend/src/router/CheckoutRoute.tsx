import { lazy, Suspense } from 'react'

import { Spinner } from '@/shared/components'

const Checkout = lazy(async () => {
  const module = await import('@/pages/Checkout')

  return { default: module.Checkout }
})

export function CheckoutRoute() {
  return (
    <Suspense fallback={<Spinner label="Preparando el checkout" />}>
      <Checkout />
    </Suspense>
  )
}
