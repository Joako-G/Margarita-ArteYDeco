import { useCallback, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CircleAlert, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { queryClient } from '@/app/query-client'
import { routes } from '@/config/routes'
import { normalizePhone } from '@/features/checkout/utils/checkout-links'
import { Button, Card, Container, Input, Section, Typography } from '@/shared/components'

import { TurnstileChallenge } from './components/TurnstileChallenge'
import { PUBLIC_ORDERS_QUERY_KEY, useRecoverOrder } from './hooks/usePublicOrders'
import {
  recoverOrderSchema,
  type RecoverOrderFormValuesType,
} from './schemas/recover-order.schema'
import {
  getLastOrderNumber,
  normalizeOrderNumber,
  setLastOrderNumber,
} from './utils/last-order'
import {
  getRecoveryErrorFeedback,
  type IRecoveryErrorFeedback,
} from './utils/public-order-errors'
import './public-orders.css'

interface IRecoveryLocationState {
  orderNumber?: string
}

export function RecoverOrderPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const recoverOrder = useRecoverOrder()
  const locationState = location.state as IRecoveryLocationState | null
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [challengeResetKey, setChallengeResetKey] = useState(0)
  const [errorFeedback, setErrorFeedback] = useState<IRecoveryErrorFeedback | null>(null)
  const [isCaptchaRequired, setIsCaptchaRequired] = useState(false)
  const form = useForm<RecoverOrderFormValuesType>({
    defaultValues: {
      orderNumber: normalizeOrderNumber(locationState?.orderNumber ?? getLastOrderNumber() ?? ''),
      phone: '',
    },
    mode: 'onBlur',
    resolver: zodResolver(recoverOrderSchema),
  })

  useEffect(() => {
    document.title = 'Recuperar pedido | Margaritas Arte & Deco'

    return () => {
      document.title = 'Margaritas Arte & Deco'
    }
  }, [])

  const handleCaptchaToken = useCallback((token: string | null) => {
    setCaptchaToken(token)
  }, [])

  async function handleRecoverOrder(values: RecoverOrderFormValuesType) {
    if (isCaptchaRequired && captchaToken === null) {
      setErrorFeedback({
        captchaRequired: true,
        message: 'Completá la verificación de seguridad antes de buscar el pedido.',
        retryAfterSeconds: null,
        title: 'Falta completar la verificación.',
      })
      return
    }

    setErrorFeedback(null)

    try {
      const result = await recoverOrder.mutateAsync({
        orderNumber: normalizeOrderNumber(values.orderNumber),
        phone: normalizePhone(values.phone),
        ...(captchaToken === null ? {} : { turnstileToken: captchaToken }),
      })

      setLastOrderNumber(result.orderNumber)
      await queryClient.invalidateQueries({ queryKey: PUBLIC_ORDERS_QUERY_KEY })
      navigate(routes.orderPath(result.orderNumber), { replace: true })
    } catch (error) {
      const feedback = getRecoveryErrorFeedback(error)

      setErrorFeedback(feedback)

      if (isCaptchaRequired || feedback.captchaRequired) {
        setIsCaptchaRequired(true)
        setCaptchaToken(null)
        setChallengeResetKey((current) => current + 1)
      }
    }
  }

  return (
    <main className="order-recovery" id="main-content">
      <Section>
        <Container className="order-recovery__container">
          <Link className="order-recovery__back" to={routes.products}>
            <ArrowLeft aria-hidden="true" size={18} strokeWidth={2} />
            Volver a productos
          </Link>

          <header className="order-recovery__heading">
            <div className="order-recovery__heading-icon" aria-hidden="true">
              <Search size={28} strokeWidth={1.75} />
            </div>
            <div>
              <Typography as="h1" variant="h1">
                Recuperá tu pedido
              </Typography>
              <p>Ingresá el número de pedido y el celular que usaste en la compra.</p>
            </div>
          </header>

          <Card className="order-recovery__card">
            {errorFeedback ? (
              <div className="order-recovery__error" role="alert">
                <CircleAlert aria-hidden="true" size={22} strokeWidth={2} />
                <div>
                  <strong>{errorFeedback.title}</strong>
                  <p>{errorFeedback.message}</p>
                </div>
              </div>
            ) : null}

            <form noValidate onSubmit={form.handleSubmit(handleRecoverOrder)}>
              <Input
                autoCapitalize="characters"
                autoComplete="off"
                error={form.formState.errors.orderNumber?.message}
                helpText="Lo encontrás en la confirmación de tu compra."
                label="Número de pedido"
                placeholder="MAD-AAAAMMDD-000001"
                {...form.register('orderNumber', {
                  onChange: (event) => {
                    event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
                  },
                })}
              />
              <Input
                autoComplete="tel"
                error={form.formState.errors.phone?.message}
                helpText="Ingresá solo números, con código de área."
                inputMode="numeric"
                label="Celular utilizado en la compra"
                maxLength={15}
                pattern="[0-9]*"
                type="tel"
                {...form.register('phone', {
                  onChange: (event) => {
                    event.target.value = normalizePhone(event.target.value)
                  },
                })}
              />

              {isCaptchaRequired ? (
                <TurnstileChallenge
                  key={challengeResetKey}
                  onTokenChange={handleCaptchaToken}
                />
              ) : null}

              <Button
                disabled={errorFeedback?.retryAfterSeconds !== null && errorFeedback !== null}
                isLoading={recoverOrder.isPending}
                loadingText="Buscando pedido…"
                size="large"
                type="submit"
              >
                Buscar pedido
              </Button>
            </form>

            <p className="order-recovery__privacy-note">
              La respuesta será la misma si el número o el celular no coinciden. Así protegemos la
              información de cada compra.
            </p>
          </Card>
        </Container>
      </Section>
    </main>
  )
}
