import type { PaymentMethodType, PaymentStatusType } from '../types/public-orders'

interface IPublicPaymentStatusDetails {
  description: string
  label: string
  variant: 'error' | 'neutral' | 'success' | 'warning'
}

export function getPublicPaymentMethodLabel(paymentMethod: PaymentMethodType): string {
  switch (paymentMethod) {
    case 'mercado_pago':
      return 'Mercado Pago'
    case 'transfer':
      return 'Transferencia bancaria'
    case 'cash':
      return 'Pago en efectivo al retirar'
  }
}

export function getPublicPaymentStatusDetails(
  paymentMethod: PaymentMethodType,
  paymentStatus: PaymentStatusType,
): IPublicPaymentStatusDetails {
  if (paymentMethod === 'cash' && paymentStatus === 'pending') {
    return {
      description: 'Abonás el total cuando retires tu pedido.',
      label: 'Pago al retirar',
      variant: 'neutral',
    }
  }

  if (paymentMethod === 'transfer' && paymentStatus === 'pending') {
    return {
      description: 'Estamos esperando confirmar la transferencia.',
      label: 'Pendiente de confirmar',
      variant: 'warning',
    }
  }

  switch (paymentStatus) {
    case 'approved':
    case 'paid':
      return {
        description: 'El pago fue confirmado.',
        label: 'Pago confirmado',
        variant: 'success',
      }
    case 'rejected':
      return { description: 'El pago fue rechazado.', label: 'Pago rechazado', variant: 'error' }
    case 'in_process':
      return {
        description: 'Mercado Pago todavía está procesando el pago. Estamos verificando el resultado.',
        label: 'Pago en proceso',
        variant: 'warning',
      }
    case 'manual_review':
      return {
        description: 'Estamos verificando el pago. No necesitás realizar otra acción por ahora.',
        label: 'Pago en revisión',
        variant: 'warning',
      }
    case 'expired':
      return {
        description: 'El tiempo para completar este pago terminó.',
        label: 'Pago vencido',
        variant: 'warning',
      }
    default:
      return {
        description: 'Todavía no confirmamos el pago.',
        label: 'Pago pendiente',
        variant: 'warning',
      }
  }
}

export function canResumePublicPayment(
  paymentMethod: PaymentMethodType,
  paymentStatus: PaymentStatusType,
  canResumePayment: boolean,
): boolean {
  return (
    paymentMethod === 'mercado_pago' &&
    (paymentStatus === 'pending' || paymentStatus === 'rejected') &&
    canResumePayment
  )
}

export function isReservationActive(reservationExpiresAt: string, now: number = Date.now()): boolean {
  const expiry = new Date(reservationExpiresAt).getTime()
  return Number.isFinite(expiry) && expiry > now
}

export function getReservationNoticeKind(
  orderStatus: string,
  paymentStatus: PaymentStatusType,
  reservationExpiresAt: string | null,
  now: number = Date.now(),
): 'active' | 'expired' | null {
  const isPaymentConfirmed = paymentStatus === 'paid' || paymentStatus === 'approved'
  if (orderStatus === 'cancelled' || isPaymentConfirmed || reservationExpiresAt === null) return null
  return isReservationActive(reservationExpiresAt, now) ? 'active' : 'expired'
}

// Browsers format "p. m." with a breakable space; a non-breaking one keeps it on one line.
export function keepMeridiemTogether(text: string): string {
  return text.replace(/([ap])\.\s*m\./, '$1.\xa0m.')
}

export function formatReservationDate(reservationExpiresAt: string, timeZone?: string): string {
  return keepMeridiemTogether(
    new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone })
      .format(new Date(reservationExpiresAt)),
  )
}

export const PUBLIC_REFUND_NOTICE =
  'Tu pedido fue cancelado. Como el pago ya estaba confirmado, nos vamos a comunicar con vos para devolverte el dinero.'

export const PUBLIC_PAID_WITHOUT_STOCK_NOTICE =
  'Recibimos tu pago, pero tu reserva había vencido y ya no tenemos stock disponible. Nos vamos a comunicar con vos para coordinar la devolución del dinero o una alternativa.'

// A late payment with stock confirms the order at once; one left pending after the reservation
// expired could not re-reserve the stock.
export function shouldShowPaidWithoutStockNotice(
  order: {
    paymentMethod: PaymentMethodType
    paymentStatus: PaymentStatusType
    reservationExpiresAt: string | null
    status: string
  },
  now: number = Date.now(),
): boolean {
  return (
    order.status === 'pending' &&
    order.paymentMethod === 'mercado_pago' &&
    (order.paymentStatus === 'paid' || order.paymentStatus === 'approved') &&
    order.reservationExpiresAt !== null &&
    !isReservationActive(order.reservationExpiresAt, now)
  )
}

export function shouldShowRefundNotice(order: {
  paymentMethod: PaymentMethodType
  paymentStatus: PaymentStatusType
  status: string
}): boolean {
  return (
    order.status === 'cancelled' &&
    order.paymentMethod === 'mercado_pago' &&
    (order.paymentStatus === 'paid' || order.paymentStatus === 'approved')
  )
}
