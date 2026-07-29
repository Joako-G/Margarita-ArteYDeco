import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { queryClient } from '@/app/query-client'
import { routes } from '@/config/routes'
import { useCart, useCartStore } from '@/features/cart'
import { CATALOG_QUERY_KEY } from '@/features/catalog/hooks/useCatalog'
import { settingsMock } from '@/mocks'
import { Card, Container, EmptyState, Section, Typography } from '@/shared/components'

import { CheckoutForm } from './components/CheckoutForm'
import { OrderConfirmation } from './components/OrderConfirmation'
import { OrderSummary } from './components/OrderSummary'
import { checkoutSchema } from './schemas/checkout.schema'
import { checkoutService } from './services/checkout.service'
import type { ICheckoutFormValues, IOrderConfirmation } from './types/checkout'
import { calculateCheckoutTotals } from './utils/checkout-calculations'
import { OrderTransactionError } from './utils/order-transaction'
import './checkout.css'

const DEFAULT_FORM_VALUES: ICheckoutFormValues = {
  firstName: '',
  lastName: '',
  notes: '',
  paymentMethod: 'cash',
  phone: '',
}

export function CheckoutPage() {
  const { items } = useCart()
  const clearCart = useCartStore((state) => state.clearCart)
  const [order, setOrder] = useState<IOrderConfirmation | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const form = useForm<ICheckoutFormValues>({
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onBlur',
    resolver: zodResolver(checkoutSchema),
  })
  const paymentMethod = useWatch({
    control: form.control,
    defaultValue: DEFAULT_FORM_VALUES.paymentMethod,
    name: 'paymentMethod',
  })
  const totals = calculateCheckoutTotals(items, paymentMethod, settingsMock.transferDiscount)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    document.title = order
      ? `Pedido ${order.orderNumber} | Margaritas Arte & Deco`
      : 'Finalizar compra | Margaritas Arte & Deco'

    return () => {
      document.title = 'Margaritas Arte & Deco'
    }
  }, [order])

  async function handleCreateOrder(values: ICheckoutFormValues) {
    setOrderError(null)

    try {
      const confirmation = await checkoutService.createOrder({
        customer: {
          firstName: values.firstName,
          lastName: values.lastName,
          notes: values.notes,
          phone: values.phone,
        },
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        paymentMethod: values.paymentMethod,
      })

      setOrder(confirmation)
      clearCart()
      await queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY })
      window.scrollTo({ top: 0 })
    } catch (error) {
      setOrderError(
        error instanceof OrderTransactionError
          ? error.message
          : 'No pudimos crear el pedido. Intentá nuevamente en unos minutos.',
      )
    }
  }

  if (order) return <OrderConfirmation order={order} />

  if (items.length === 0) {
    return (
      <main className="checkout checkout--empty" id="main-content">
        <Container>
          <EmptyState
            action={
              <Link className="checkout__link-button" to={routes.products}>
                Explorar productos
              </Link>
            }
            description="Agregá los materiales que necesitás y volvé cuando estés listo para confirmar."
            icon={<ShoppingBag aria-hidden="true" size={40} strokeWidth={1.75} />}
            title="Tu carrito todavía está vacío"
          />
        </Container>
      </main>
    )
  }

  return (
    <main className="checkout" id="main-content">
      <Section>
        <Container>
          <div className="checkout__header">
            <Link className="checkout__back-link" to={routes.products}>
              <ArrowLeft aria-hidden="true" size={18} strokeWidth={2} />
              Volver al catálogo
            </Link>
            <div>
              <Typography as="h1" variant="h1">
                Finalizá tu compra
              </Typography>
              <p>Revisá el pedido, completá tus datos y elegí cómo preferís pagar.</p>
            </div>
          </div>

          <form
            className="checkout__layout"
            id="checkout-form"
            noValidate
            onSubmit={form.handleSubmit(handleCreateOrder)}
          >
            <Card className="checkout__form-card">
              {orderError ? (
                <div className="checkout__error" role="alert">
                  <strong>No pudimos confirmar el pedido.</strong>
                  <p>{orderError}</p>
                </div>
              ) : null}
              <CheckoutForm
                errors={form.formState.errors}
                register={form.register}
                settings={settingsMock}
              />
            </Card>
            <Card className="checkout__summary-card">
              <OrderSummary
                isSubmitting={form.formState.isSubmitting}
                items={items}
                paymentMethod={paymentMethod}
                totals={totals}
              />
            </Card>
          </form>
        </Container>
      </Section>
    </main>
  )
}
