import { useEffect, useState } from 'react'
import { CircleAlert, SearchX } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { queryClient } from '@/app/query-client'
import { routes } from '@/config/routes'
import { Button, Container, EmptyState, Modal, Section, Spinner } from '@/shared/components'

import { OrderDetails } from './components/OrderDetails'
import {
  PUBLIC_ORDERS_QUERY_KEY,
  useForgetOrders,
  usePublicOrder,
} from './hooks/usePublicOrders'
import {
  clearLastOrderNumber,
  isValidOrderNumber,
  normalizeOrderNumber,
  setLastOrderNumber,
} from './utils/last-order'
import { isOrderSessionUnavailable } from './utils/public-order-errors'
import './public-orders.css'

export function OrderPage() {
  const navigate = useNavigate()
  const { orderNumber: routeOrderNumber = '' } = useParams()
  const orderNumber = normalizeOrderNumber(routeOrderNumber)
  const isOrderNumberValid = isValidOrderNumber(orderNumber)
  const orderQuery = usePublicOrder(orderNumber, isOrderNumberValid)
  const forgetOrders = useForgetOrders()
  const [isForgetModalOpen, setIsForgetModalOpen] = useState(false)
  const [forgetError, setForgetError] = useState<string | null>(null)

  useEffect(() => {
    document.title = isOrderNumberValid
      ? `Pedido ${orderNumber} | Margaritas Arte & Deco`
      : 'Consultar pedido | Margaritas Arte & Deco'

    return () => {
      document.title = 'Margaritas Arte & Deco'
    }
  }, [isOrderNumberValid, orderNumber])

  useEffect(() => {
    if (orderQuery.data !== undefined) setLastOrderNumber(orderQuery.data.orderNumber)
  }, [orderQuery.data])

  async function handleForgetOrders() {
    setForgetError(null)

    try {
      await forgetOrders.mutateAsync()
      clearLastOrderNumber()
      await queryClient.cancelQueries({ queryKey: PUBLIC_ORDERS_QUERY_KEY })
      queryClient.removeQueries({ queryKey: PUBLIC_ORDERS_QUERY_KEY })
      setIsForgetModalOpen(false)
      navigate(routes.products, { replace: true })
    } catch {
      setForgetError('No pudimos olvidar los pedidos de este dispositivo. Intentá nuevamente.')
    }
  }

  if (!isOrderNumberValid || (orderQuery.isError && isOrderSessionUnavailable(orderQuery.error))) {
    return (
      <main className="public-order-state" id="main-content">
        <Section>
          <Container>
            <EmptyState
              action={
                <Link
                  className="public-order__button"
                  state={{ orderNumber }}
                  to={routes.recoverOrder}
                >
                  Recuperar pedido
                </Link>
              }
              description={`No podemos mostrar ${orderNumber || 'ese pedido'} desde este dispositivo. Podés recuperarlo con el celular utilizado en la compra.`}
              icon={<SearchX aria-hidden="true" size={40} strokeWidth={1.75} />}
              title="Necesitamos verificar el pedido"
            />
          </Container>
        </Section>
      </main>
    )
  }

  if (orderQuery.isPending) {
    return (
      <main className="public-order-state" id="main-content">
        <Section>
          <Container>
            <div aria-live="polite" role="status">
              <EmptyState
                description="Estamos consultando la información más reciente."
                icon={<Spinner isDecorative size="large" />}
                title="Buscando tu pedido"
              />
            </div>
          </Container>
        </Section>
      </main>
    )
  }

  if (orderQuery.isError || orderQuery.data === undefined) {
    return (
      <main className="public-order-state" id="main-content">
        <Section>
          <Container>
            <EmptyState
              action={<Button onClick={() => orderQuery.refetch()}>Reintentar</Button>}
              description="Tu referencia sigue disponible. Intentá nuevamente en unos minutos."
              icon={<CircleAlert aria-hidden="true" size={40} strokeWidth={1.75} />}
              title="No pudimos consultar el pedido"
            />
          </Container>
        </Section>
      </main>
    )
  }

  return (
    <>
      <OrderDetails
        isForgetting={forgetOrders.isPending}
        onForget={() => setIsForgetModalOpen(true)}
        order={orderQuery.data}
      />
      <Modal
        footer={
          <div className="public-order__modal-actions">
            <Button onClick={() => setIsForgetModalOpen(false)} variant="ghost">
              Conservar acceso
            </Button>
            <Button
              isLoading={forgetOrders.isPending}
              loadingText="Olvidando pedidos…"
              onClick={handleForgetOrders}
            >
              Olvidar pedidos
            </Button>
          </div>
        }
        isOpen={isForgetModalOpen}
        onClose={() => setIsForgetModalOpen(false)}
        title="¿Olvidar los pedidos de este dispositivo?"
      >
        <p className="public-order__modal-copy">
          Este dispositivo dejará de consultarlos. Los pedidos y el historial del negocio no se
          eliminarán; podrás recuperar uno nuevamente con su número y el celular de la compra.
        </p>
        {forgetError ? <p className="public-order__modal-error" role="alert">{forgetError}</p> : null}
      </Modal>
    </>
  )
}
