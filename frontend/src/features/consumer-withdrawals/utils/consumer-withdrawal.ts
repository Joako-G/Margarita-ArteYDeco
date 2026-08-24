import { getApiErrorResponse, getApiErrorStatus } from '@/shared/services/api/errors'

export const CONSUMER_WITHDRAWAL_STATUS_LABELS = {
  applicable: 'Corresponde',
  action_required: 'Necesitamos coordinar con vos',
  closed: 'Solicitud finalizada',
  not_applicable: 'No corresponde',
  received: 'Solicitud recibida',
  under_review: 'Solicitud en revisión',
} as const

export function normalizeRequestCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

export function getConsumerWithdrawalError(error: unknown): {
  captchaRequired: boolean
  isRateLimited: boolean
  message: string
} {
  const response = getApiErrorResponse(error)
  const isRateLimited = getApiErrorStatus(error) === 429
  return {
    captchaRequired: response?.captchaRequired === true,
    isRateLimited,
    message: isRateLimited
      ? 'Recibimos varios intentos. Esperá unos minutos o utilizá el canal alternativo de atención.'
      : 'No pudimos procesar la solicitud en este momento. Intentá nuevamente.',
  }
}
