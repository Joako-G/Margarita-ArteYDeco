import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  SearchX,
  ShieldAlert,
  TimerOff,
  XCircle,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { routes } from '@/config/routes'
import { isValidOrderNumber, normalizeOrderNumber } from '@/features/public-orders/utils/last-order'
import { Badge, Button, Container, EmptyState, Typography } from '@/shared/components'
import { getApiErrorResponse } from '@/shared/services/api/errors'

import { usePaymentStatus } from './hooks/usePaymentStatus'
import { checkoutService } from './services/checkout.service'
import type { PaymentStatusType } from './types/payment-status'
import { getMercadoPagoReturnSignal, getPaymentStatusPresentation } from './utils/payment-status'
import './checkout.css'

const STATUS_COPY: Record<PaymentStatusType, { description: string; title: string }> = {
  approved: {
    description: 'Tu pago fue aprobado. Podés consultar el detalle del pedido.',
    title: 'Pago aprobado',
  },
  expired: {
    description:
      'El tiempo para iniciar un nuevo pago terminó. No confirmamos la liberación del stock desde esta pantalla.',
    title: 'La reserva venció',
  },
  manual_review: {
    description:
      'Necesitamos revisar el pago de forma manual. Conservá tu número de pedido para contactarnos.',
    title: 'Estamos revisando tu pago',
  },
  in_process: {
    description:
      'Mercado Pago todavía está procesando el pago. Estamos verificando el resultado con nuestro sistema.',
    title: 'Estamos verificando tu pago',
  },
  pending: {
    description:
      'Estamos verificando el pago con Mercado Pago. Podés actualizar esta pantalla en unos segundos.',
    title: 'Estamos verificando tu pago',
  },
  rejected: {
    description:
      'Mercado Pago rechazó este intento. Podés volver a intentarlo mientras la reserva siga vigente.',
    title: 'No pudimos aprobar el pago',
  },
}

const STATUS_LABELS: Record<PaymentStatusType, string> = {
  approved: 'Aprobado',
  expired: 'Vencido o cancelado',
  manual_review: 'Revisión manual',
  in_process: 'En proceso',
  pending: 'Pendiente',
  rejected: 'Rechazado',
}

const STATUS_VARIANTS: Record<PaymentStatusType, 'error' | 'neutral' | 'success' | 'warning'> = {
  approved: 'success',
  expired: 'error',
  manual_review: 'warning',
  in_process: 'warning',
  pending: 'warning',
  rejected: 'error',
}

function getStatusIcon(status: PaymentStatusType) {
  if (status === 'approved') return <CheckCircle2 aria-hidden="true" size={40} />
  if (status === 'rejected') return <XCircle aria-hidden="true" size={40} />
  if (status === 'expired') return <TimerOff aria-hidden="true" size={40} />
  if (status === 'manual_review') return <ShieldAlert aria-hidden="true" size={40} />

  return <Clock3 aria-hidden="true" size={40} />
}

function formatRemainingTime(expiresAt: string, now: number): string {
  const remainingSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000))
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = String(remainingSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function PaymentStatusContent({
  hasError,
  isProvisional,
  isTimedOut,
  onRefresh,
  status,
}: {
  hasError: boolean
  isProvisional: boolean
  isTimedOut: boolean
  onRefresh: () => void
  status: NonNullable<ReturnType<typeof usePaymentStatus>['data']>
}) {
  const [now, setNow] = useState(() => Date.now())
  const [isResuming, setIsResuming] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const copy = isProvisional
    ? {
        description:
          'Recibimos la respuesta de Mercado Pago. Estamos confirmando el estado final con nuestro sistema.',
        title: 'Estamos confirmando tu pago',
      }
    : STATUS_COPY[status.status]
  const remainingTime = useMemo(
    () => formatRemainingTime(status.reservationExpiresAt, now),
    [now, status.reservationExpiresAt],
  )
  const reservationExpiry = new Date(status.reservationExpiresAt).getTime()
  const isReservationActive = Number.isFinite(reservationExpiry) && reservationExpiry > now
  const canResume =
    (status.status === 'pending' || status.status === 'rejected') && isReservationActive

  async function handleResumePayment() {
    setIsResuming(true)
    setResumeError(null)

    try {
      const result = await checkoutService.resumeMercadoPagoCheckout(status.orderNumber)
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      const response = getApiErrorResponse(error)
      setResumeError(
        response?.message ??
          'No pudimos recuperar el checkout. Actualizá el estado e intentá nuevamente.',
      )
    } finally {
      setIsResuming(false)
    }
  }

  useEffect(() => {
    if (status.status !== 'pending' && status.status !== 'in_process' && status.status !== 'rejected' && status.status !== 'manual_review') return

    const interval = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(interval)
  }, [status.status])

  return (
    <main className="checkout checkout--empty" id="main-content">
      <Container>
        <section aria-live="polite" className="checkout__payment-status">
          <div
            className={`checkout__payment-status-icon checkout__payment-status-icon--${status.status}`}
          >
            {getStatusIcon(status.status)}
          </div>
          <Typography as="h1" variant="h1">
            {copy.title}
          </Typography>
          <p>{copy.description}</p>
          <Badge variant={isProvisional ? 'warning' : STATUS_VARIANTS[status.status]}>
            {isProvisional ? 'Confirmación en curso' : STATUS_LABELS[status.status]}
          </Badge>
          <p className="checkout__payment-order">Pedido {status.orderNumber}</p>
          {hasError ? (
            <p role="alert">
              No pudimos actualizar la confirmación automáticamente. Podés intentarlo de nuevo.
            </p>
          ) : null}
          {isTimedOut ? (
            <p>
              La confirmación todavía está en progreso. No mostramos el pago como aprobado hasta
              verificarlo con el sistema.
            </p>
          ) : null}
          {(status.status === 'pending' || status.status === 'in_process' || status.status === 'rejected' || status.status === 'manual_review') && isReservationActive ? (
            <p className="checkout__payment-countdown">
              Tiempo disponible: <strong>{remainingTime}</strong>
            </p>
          ) : null}
          <div className="checkout__payment-actions">
            <Link className="checkout__link-button" to={routes.orderPath(status.orderNumber)}>
              Ver detalle del pedido
            </Link>
            {isProvisional || status.status === 'pending' || isTimedOut || hasError ? (
              <Button onClick={onRefresh} variant="secondary">
                <RefreshCw aria-hidden="true" size={18} /> Actualizar estado
              </Button>
            ) : null}
            {canResume ? (
              <Button
                isLoading={isResuming}
                loadingText="Recuperando checkout…"
                onClick={handleResumePayment}
              >
                Continuar pago
              </Button>
            ) : null}
            <Link className="checkout__payment-recovery-link" to={routes.recoverOrder}>
              Recuperar otro pedido
            </Link>
          </div>
          {resumeError ? <p role="alert">{resumeError}</p> : null}
        </section>
      </Container>
    </main>
  )
}

export function PaymentStatusPage() {
  const { orderNumber: rawOrderNumber = '' } = useParams()
  const orderNumber = normalizeOrderNumber(rawOrderNumber)
  const isValid = isValidOrderNumber(orderNumber)
  const returnSignal = getMercadoPagoReturnSignal(
    new URLSearchParams(window.location.search),
    orderNumber,
  )
  const paymentQuery = usePaymentStatus(orderNumber, isValid, returnSignal === 'approved')
  const presentation = getPaymentStatusPresentation(returnSignal, paymentQuery.data?.status)
  const isProvisional = presentation === 'provisional-approved'
  const currentStatus = paymentQuery.isAuthoritativeStatusReady && !isProvisional ? paymentQuery.data : undefined
  const displayStatus = currentStatus ?? {
    nextAction: 'refresh' as const,
    orderNumber,
            reservationExpiresAt: '',
    status: 'pending' as const,
  }

  useEffect(() => {
    document.title = `Estado del pago | Margaritas Arte & Deco`
    return () => {
      document.title = 'Margaritas Arte & Deco'
    }
  }, [])

  if (!isValid) {
    return (
      <main className="checkout checkout--empty" id="main-content">
        <Container>
          <EmptyState
            action={
              <Link className="checkout__link-button" to={routes.recoverOrder}>
                Recuperar pedido
              </Link>
            }
            description="Necesitamos verificar tu sesión para consultar el pago. Podés recuperar el pedido con el celular utilizado en la compra."
            icon={<SearchX />}
            title="No pudimos consultar el pago"
          />
        </Container>
      </main>
    )
  }

  return (
    <PaymentStatusContent
      hasError={paymentQuery.isError}
       isProvisional={isProvisional}
      isTimedOut={paymentQuery.isAutoPollingTimedOut}
      onRefresh={() => void paymentQuery.refreshPaymentStatus()}
      status={displayStatus}
    />
  )
}
