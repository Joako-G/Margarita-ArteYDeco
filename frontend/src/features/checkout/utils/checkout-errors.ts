import { getApiErrorCode } from '../../../shared/services/api/errors.ts'

export type CheckoutErrorKindType =
  | 'csrf'
  | 'rate-limit'
  | 'stock'
  | 'temporary'
  | 'uncertain'
  | 'validation'

export interface ICheckoutErrorFeedback {
  blocksResubmission: boolean
  kind: CheckoutErrorKindType
  message: string
  title: string
}

export function getCheckoutApiErrorCode(error: unknown): string | null {
  return getApiErrorCode(error)
}

export function getCheckoutErrorFeedback(error: unknown): ICheckoutErrorFeedback {
  const errorCode = getCheckoutApiErrorCode(error)

  if (errorCode === 'PRODUCT_UNAVAILABLE') {
    return {
      blocksResubmission: false,
      kind: 'stock',
      message: 'Revisá los cambios del carrito antes de volver a confirmar.',
      title: 'Cambió la disponibilidad de tu pedido.',
    }
  }

  if (errorCode === 'VALIDATION_ERROR' || errorCode === 'INVALID_ORDER') {
    return {
      blocksResubmission: false,
      kind: 'validation',
      message: 'Revisá tus datos y el contenido del carrito antes de intentarlo nuevamente.',
      title: 'No pudimos validar el pedido.',
    }
  }

  if (errorCode === 'INVALID_CSRF_TOKEN' || errorCode === 'ORIGIN_NOT_ALLOWED') {
    return {
      blocksResubmission: false,
      kind: 'csrf',
      message: 'Actualizá la página y volvé a intentarlo. Tu carrito sigue guardado.',
      title: 'La sesión segura del checkout venció.',
    }
  }

  if (errorCode === 'ORDER_RATE_LIMIT_EXCEEDED' || errorCode === 'RATE_LIMIT_EXCEEDED') {
    return {
      blocksResubmission: false,
      kind: 'rate-limit',
      message: 'Esperá unos minutos antes de volver a intentarlo. Tu carrito sigue guardado.',
      title: 'Alcanzaste el límite de intentos.',
    }
  }

  if (errorCode === 'ORDER_CONFIRMATION_UNAVAILABLE') {
    return {
      blocksResubmission: true,
      kind: 'uncertain',
      message: 'El pedido pudo haberse creado. No vuelvas a enviarlo; conservá esta página y contactanos para verificarlo.',
      title: 'No pudimos mostrar la confirmación.',
    }
  }

  return {
    blocksResubmission: false,
    kind: 'temporary',
    message: 'Intentá nuevamente en unos minutos. Tu carrito sigue guardado.',
    title: 'No pudimos conectar con el servicio de pedidos.',
  }
}
