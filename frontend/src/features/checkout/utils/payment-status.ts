import type { PaymentStatusType } from '../types/payment-status'

const TERMINAL_PAYMENT_STATUSES = new Set(['approved', 'expired', 'manual_review', 'rejected'])

export const PAYMENT_STATUS_POLL_INTERVALS = [4_000, 6_000, 8_000, 10_000] as const
export const PAYMENT_STATUS_AUTO_POLL_WINDOW = 60_000

export type MercadoPagoReturnSignal = 'ambiguous' | 'approved' | 'none'
export type PaymentStatusPresentation = PaymentStatusType | 'provisional-approved'

export function shouldPollPaymentStatus(status: string | undefined): boolean {
  return status !== undefined && !TERMINAL_PAYMENT_STATUSES.has(status)
}

export function shouldContinuePaymentStatusPolling(
  status: string | undefined,
  reconcileApprovedReturn: boolean,
): boolean {
  return shouldPollPaymentStatus(status)
    || (reconcileApprovedReturn && status !== undefined && status !== 'approved')
}

export function getPaymentStatusPollingInterval(pollCount: number): number {
  const safePollCount = Math.max(0, Math.floor(pollCount))
  return PAYMENT_STATUS_POLL_INTERVALS[
    Math.min(safePollCount, PAYMENT_STATUS_POLL_INTERVALS.length - 1)
  ]
}

function getReturnValues(searchParams: URLSearchParams): string[] {
  return ['status', 'collection_status']
    .flatMap((key) => searchParams.getAll(key).map((value) => value.trim().toLowerCase()))
    .filter(Boolean)
}

export function getMercadoPagoReturnSignal(
  searchParams: URLSearchParams,
  orderNumber: string,
): MercadoPagoReturnSignal {
  const returnValues = getReturnValues(searchParams)
  const externalReference = searchParams.get('external_reference')?.trim().toUpperCase()
  const hasConflictingStatus = returnValues.some((value) => value !== 'approved')
  const hasMismatchedOrder =
    externalReference !== undefined && externalReference !== '' && externalReference !== orderNumber

  if (hasConflictingStatus || hasMismatchedOrder) return 'ambiguous'
  if (returnValues.includes('approved')) return 'approved'

  return 'none'
}

export function getPaymentStatusPresentation(
  returnSignal: MercadoPagoReturnSignal,
  authoritativeStatus: PaymentStatusType | undefined,
): PaymentStatusPresentation | null {
  if (returnSignal === 'approved' && (authoritativeStatus === 'pending' || authoritativeStatus === 'rejected')) {
    return 'provisional-approved'
  }
  if (authoritativeStatus !== undefined) return authoritativeStatus
  if (returnSignal === 'approved') return 'provisional-approved'

  return null
}
