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
