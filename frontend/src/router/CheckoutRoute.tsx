import { lazy, Suspense } from 'react'
import { CircleAlert, ShoppingBag } from 'lucide-react'

import { queryClient } from '@/app/query-client'
import { CATALOG_QUERY_KEY } from '@/features/catalog/hooks/useCatalog'
import { useCartStore } from '@/features/cart'
import { Button, Container, EmptyState, Section, Spinner } from '@/shared/components'

const Checkout = lazy(async () => {
  const module = await import('@/pages/Checkout')

  return { default: module.Checkout }
})

export function CheckoutRoute() {
  const availabilityChanges = useCartStore((state) => state.availabilityChanges)
  const availabilityStatus = useCartStore((state) => state.availabilityStatus)
  const items = useCartStore((state) => state.items)
  const openCart = useCartStore((state) => state.openCart)

  function retryAvailability() {
    void queryClient.refetchQueries({ queryKey: CATALOG_QUERY_KEY })
  }

  if (items.length > 0 && availabilityStatus === 'checking') {
    return (
      <main id="main-content">
        <Section>
          <Container>
            <div aria-live="polite" role="status">
              <EmptyState
                description="En un momento vas a poder continuar con tu compra."
                icon={<Spinner isDecorative size="large" />}
                title="Estamos verificando tu carrito"
              />
            </div>
          </Container>
        </Section>
      </main>
    )
  }

  if (items.length > 0 && availabilityStatus === 'error') {
    return (
      <main id="main-content">
        <Section>
          <Container>
            <EmptyState
              action={<Button onClick={retryAvailability}>Reintentar</Button>}
              description="Necesitamos confirmar el stock antes de continuar con tu compra."
              icon={<CircleAlert />}
              title="No pudimos verificar tu carrito"
            />
          </Container>
        </Section>
      </main>
    )
  }

  if (availabilityChanges.length > 0) {
    return (
      <main id="main-content">
        <Section>
          <Container>
            <EmptyState
              action={<Button onClick={openCart}>Revisar carrito</Button>}
              description="Confirmá los cambios de disponibilidad para seguir con tu compra."
              icon={<ShoppingBag />}
              title="Actualizamos algunos productos"
            />
          </Container>
        </Section>
      </main>
    )
  }

  return (
    <Suspense fallback={<Spinner label="Preparando el checkout" />}>
      <Checkout />
    </Suspense>
  )
}
