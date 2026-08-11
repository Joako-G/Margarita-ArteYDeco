import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CircleAlert, ShoppingBag } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { queryClient } from '@/app/query-client'
import { routes } from '@/config/routes'
import { useCart, useCartStore } from '@/features/cart'
import { CATALOG_QUERY_KEY } from '@/features/catalog/hooks/useCatalog'
import { usePublicSettings } from '@/features/settings'
import { publicOrdersService } from '@/features/public-orders/services/public-orders.service'
import { PUBLIC_ORDERS_QUERY_KEY } from '@/features/public-orders/hooks/usePublicOrders'
import { setLastOrderNumber } from '@/features/public-orders/utils/last-order'
import {
  Button,
  Card,
  Container,
  EmptyState,
  Section,
  Spinner,
  Typography,
} from '@/shared/components'

import { CheckoutForm } from './components/CheckoutForm'
import { OrderSummary } from './components/OrderSummary'
import { checkoutSchema } from './schemas/checkout.schema'
import { checkoutService } from './services/checkout.service'
import { useCheckoutDraftStore } from './stores/checkout-draft.store'
import type { ICheckoutFormValues, IOrderConfirmation } from './types/checkout'
import { calculateCheckoutTotals } from './utils/checkout-calculations'
import { getCheckoutErrorFeedback, type ICheckoutErrorFeedback } from './utils/checkout-errors'
import './checkout.css'

const DEFAULT_FORM_VALUES: ICheckoutFormValues = {
  acceptTerms: false,
  deliveryMethod: 'pickup',
  firstName: '',
  lastName: '',
  notes: '',
  paymentMethod: 'cash',
  phone: '',
  shippingAddress: '',
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { items } = useCart()
  const clearCart = useCartStore((state) => state.clearCart)
  const checkoutDraft = useCheckoutDraftStore((state) => state.draft)
  const clearCheckoutDraft = useCheckoutDraftStore((state) => state.clearDraft)
  const setCheckoutDraft = useCheckoutDraftStore((state) => state.setDraft)
  const {
    data: settings,
    isError: isSettingsError,
    isPending: isSettingsPending,
    refetch: refetchSettings,
  } = usePublicSettings()
  const [orderError, setOrderError] = useState<ICheckoutErrorFeedback | null>(null)
  const form = useForm<ICheckoutFormValues>({
    defaultValues: checkoutDraft ?? DEFAULT_FORM_VALUES,
    mode: 'onBlur',
    resolver: zodResolver(checkoutSchema),
  })
  const { setValue } = form
  const paymentMethod = useWatch({
    control: form.control,
    defaultValue: DEFAULT_FORM_VALUES.paymentMethod,
    name: 'paymentMethod',
  })
  const deliveryMethod = useWatch({
    control: form.control,
    defaultValue: DEFAULT_FORM_VALUES.deliveryMethod,
    name: 'deliveryMethod',
  })
  const watchedValues = useWatch({ control: form.control })
  const watchedAcceptTerms = watchedValues.acceptTerms
  const watchedDeliveryMethod = watchedValues.deliveryMethod
  const watchedFirstName = watchedValues.firstName
  const watchedLastName = watchedValues.lastName
  const watchedNotes = watchedValues.notes
  const watchedPaymentMethod = watchedValues.paymentMethod
  const watchedPhone = watchedValues.phone
  const watchedShippingAddress = watchedValues.shippingAddress
  const totals = calculateCheckoutTotals(items, paymentMethod, settings?.transferDiscount ?? 0)
  const validationErrorCount = Object.keys(form.formState.errors).length
  const shouldShowValidationSummary = form.formState.submitCount > 0 && validationErrorCount > 0

  useEffect(() => {
    if (deliveryMethod === 'shipping' && form.getValues('paymentMethod') !== 'transfer') {
      setValue('paymentMethod', 'transfer', { shouldValidate: true })
    }
  }, [deliveryMethod, form, setValue])

  useEffect(() => {
    setCheckoutDraft({
      acceptTerms: watchedAcceptTerms ?? false,
      deliveryMethod: watchedDeliveryMethod ?? DEFAULT_FORM_VALUES.deliveryMethod,
      firstName: watchedFirstName ?? '',
      lastName: watchedLastName ?? '',
      notes: watchedNotes ?? '',
      paymentMethod: watchedPaymentMethod ?? DEFAULT_FORM_VALUES.paymentMethod,
      phone: watchedPhone ?? '',
      shippingAddress: watchedShippingAddress ?? '',
    })
  }, [
    setCheckoutDraft,
    watchedAcceptTerms,
    watchedDeliveryMethod,
    watchedFirstName,
    watchedLastName,
    watchedNotes,
    watchedPaymentMethod,
    watchedPhone,
    watchedShippingAddress,
  ])

  useEffect(() => {
    document.title = 'Finalizar compra | Margaritas Arte & Deco'

    return () => {
      document.title = 'Margaritas Arte & Deco'
    }
  }, [])

  function completeOrder(confirmation: IOrderConfirmation) {
    setLastOrderNumber(confirmation.orderNumber)
    clearCart()
    clearCheckoutDraft()
    void queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: PUBLIC_ORDERS_QUERY_KEY })
    navigate(routes.orderPath(confirmation.orderNumber), { replace: true })
  }

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
        deliveryMethod: values.deliveryMethod,
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        paymentMethod: values.paymentMethod,
        shippingAddress: values.shippingAddress,
      })

      completeOrder(confirmation)
    } catch (error) {
      const feedback = getCheckoutErrorFeedback(error)

      if (feedback.kind === 'uncertain') {
        try {
          const recentOrder = await publicOrdersService.fetchRecentOrder()

          if (recentOrder !== null) {
            completeOrder(recentOrder)
            return
          }
        } catch {
          // The controlled feedback below prevents a duplicate submission.
        }
      }

      setOrderError(feedback)

      if (feedback.kind === 'stock') {
        await queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY })
      }
    }
  }

  if (isSettingsPending) {
    return (
      <main className="checkout checkout--empty" id="main-content">
        <Container>
          <div aria-live="polite" role="status">
            <EmptyState
              description="Estamos cargando los datos de entrega y el descuento vigente."
              icon={<Spinner isDecorative size="large" />}
              title="Preparando tu compra"
            />
          </div>
        </Container>
      </main>
    )
  }

  if (isSettingsError || settings === undefined) {
    return (
      <main className="checkout checkout--empty" id="main-content">
        <Container>
          <EmptyState
            action={<Button onClick={() => refetchSettings()}>Reintentar</Button>}
            description="Necesitamos confirmar la dirección, los horarios y el descuento antes de crear el pedido. Tu carrito sigue guardado."
            icon={<CircleAlert />}
            title="No pudimos cargar los datos del local"
          />
        </Container>
      </main>
    )
  }

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
              {shouldShowValidationSummary ? (
                <div className="checkout__validation-summary" role="alert">
                  <CircleAlert aria-hidden="true" size={22} strokeWidth={2} />
                  <div>
                    <strong>Revisá los datos marcados.</strong>
                    <p>
                      {validationErrorCount === 1
                        ? 'Hay un campo que necesita tu atención.'
                        : `Hay ${validationErrorCount} campos que necesitan tu atención.`}
                    </p>
                  </div>
                </div>
              ) : null}
              {orderError ? (
                <div className="checkout__error" role="alert">
                  <strong>{orderError.title}</strong>
                  <p>{orderError.message}</p>
                </div>
              ) : null}
              <CheckoutForm
                errors={form.formState.errors}
                deliveryMethod={deliveryMethod}
                register={form.register}
                settings={settings}
              />
            </Card>
            <Card className="checkout__summary-card">
              <OrderSummary
                errors={form.formState.errors}
                isSubmissionBlocked={orderError?.blocksResubmission ?? false}
                isSubmitting={form.formState.isSubmitting}
                items={items}
                paymentMethod={paymentMethod}
                register={form.register}
                totals={totals}
              />
            </Card>
          </form>
        </Container>
      </Section>
    </main>
  )
}
