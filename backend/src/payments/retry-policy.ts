export const PAYMENT_RETRY_DELAYS_MINUTES = [1, 2, 4, 8, 15] as const
export const MAX_PAYMENT_ATTEMPTS = PAYMENT_RETRY_DELAYS_MINUTES.length
export const PAYMENT_RECONCILIATION_INTERVAL_MINUTES = 45
export const PAYMENT_FINAL_RECONCILIATION_MARGIN_MINUTES = 5

export type PaymentFailureDisposition = 'retry' | 'dead_letter' | 'manual_review'

export interface PaymentRetryDecision {
  availableAt: Date | null
  disposition: PaymentFailureDisposition
  attempt: number
}

export function schedulePaymentReconciliation(
  claimedAttempts: number,
  now: Date,
  reservationExpiresAt: Date,
  marginMinutes = PAYMENT_FINAL_RECONCILIATION_MARGIN_MINUTES,
): PaymentRetryDecision {
  const expiry = reservationExpiresAt.getTime()
  const finalQueryAt = expiry - Math.max(0, marginMinutes) * 60_000
  // claim_payment_job_v2 increments attempts before returning the leased row.
  // Therefore the first claimed reconciliation is attempt 1, not attempt 0.
  const scheduleIndex = Math.max(0, claimedAttempts - 1)
  const delayMinutes = scheduleIndex < PAYMENT_RETRY_DELAYS_MINUTES.length
    ? PAYMENT_RETRY_DELAYS_MINUTES[scheduleIndex]!
    : PAYMENT_RECONCILIATION_INTERVAL_MINUTES
  const scheduledAt = now.getTime() + delayMinutes * 60_000
  const nextAt = Math.min(scheduledAt, finalQueryAt)
  if (nextAt <= now.getTime()) return { attempt: claimedAttempts + 1, availableAt: null, disposition: 'manual_review' }
  return { attempt: claimedAttempts + 1, availableAt: new Date(nextAt), disposition: 'retry' }
}

export function schedulePaymentRetry(
  attempts: number,
  now: Date,
  reservationExpiresAt: Date,
  random = Math.random(),
): PaymentRetryDecision {
  const attempt = attempts + 1
  if (attempts >= MAX_PAYMENT_ATTEMPTS) {
    return { availableAt: null, disposition: 'dead_letter', attempt }
  }

  const jitter = 0.8 + Math.min(1, Math.max(0, random)) * 0.4
  const delayMs = PAYMENT_RETRY_DELAYS_MINUTES[attempts]! * 60_000 * jitter
  const availableAt = new Date(now.getTime() + delayMs)
  if (availableAt >= reservationExpiresAt) {
    return { availableAt: null, disposition: 'manual_review', attempt }
  }

  return { availableAt, disposition: 'retry', attempt }
}

export function sanitizeReviewReason(reason: string): string {
  return [...reason].map((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? ' ' : character).join('').replace(/\s+/g, ' ').trim().slice(0, 500)
}
