import { getApiErrorCode, getApiErrorResponse } from '../../../shared/services/api/errors.ts'

export interface IRecoveryErrorFeedback {
  captchaRequired: boolean
  message: string
  retryAfterSeconds: number | null
  title: string
}

export function getRecoveryErrorFeedback(error: unknown): IRecoveryErrorFeedback {
  const response = getApiErrorResponse(error)
  const errorCode = response?.error
  const captchaRequired = response?.captchaRequired === true

  if (errorCode === 'ORDER_RECOVERY_BLOCKED') {
    return {
      captchaRequired,
      message: formatRetryMessage(response?.retryAfterSeconds),
      retryAfterSeconds: response?.retryAfterSeconds ?? null,
      title: 'La recuperación está temporalmente bloqueada.',
    }
  }

  if (errorCode === 'HUMAN_VERIFICATION_REQUIRED') {
    return {
      captchaRequired: true,
      message: 'Completá la verificación de seguridad y volvé a buscar el pedido.',
      retryAfterSeconds: null,
      title: 'Necesitamos verificar que sos una persona.',
    }
  }

  if (errorCode === 'HUMAN_VERIFICATION_UNAVAILABLE') {
    return {
      captchaRequired: true,
      message: 'La verificación de seguridad no está disponible. Intentá nuevamente más tarde.',
      retryAfterSeconds: null,
      title: 'No pudimos completar la verificación.',
    }
  }

  if (errorCode === 'INVALID_CSRF_TOKEN' || errorCode === 'ORIGIN_NOT_ALLOWED') {
    return {
      captchaRequired,
      message: 'Actualizá la página antes de volver a intentarlo.',
      retryAfterSeconds: null,
      title: 'La sesión segura del formulario venció.',
    }
  }

  if (errorCode === 'ORDER_RECOVERY_FAILED') {
    return {
      captchaRequired,
      message: 'Revisá los datos ingresados o intentá nuevamente más tarde.',
      retryAfterSeconds: null,
      title: 'No pudimos recuperar el pedido con esos datos.',
    }
  }

  return {
    captchaRequired,
    message: 'Intentá nuevamente en unos minutos.',
    retryAfterSeconds: null,
    title: 'No pudimos conectar con el servicio de pedidos.',
  }
}

export function isOrderSessionUnavailable(error: unknown): boolean {
  return ['GUEST_SESSION_REQUIRED', 'ORDER_NOT_AVAILABLE'].includes(
    getApiErrorCode(error) ?? '',
  )
}

export function isGuestSessionRequired(error: unknown): boolean {
  return getApiErrorCode(error) === 'GUEST_SESSION_REQUIRED'
}

function formatRetryMessage(retryAfterSeconds: number | undefined): string {
  if (retryAfterSeconds === undefined) {
    return 'Esperá unos minutos antes de volver a intentarlo.'
  }

  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60))

  return minutes === 1
    ? 'Intentá nuevamente dentro de 1 minuto.'
    : `Intentá nuevamente dentro de ${minutes} minutos.`
}
