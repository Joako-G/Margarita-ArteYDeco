import { describe, expect, it, vi } from 'vitest'

import type { PaymentJob } from '../repositories/payment-jobs.repository.js'
import { MAX_PAYMENT_ATTEMPTS, PAYMENT_RETRY_DELAYS_MINUTES, schedulePaymentReconciliation, schedulePaymentRetry } from '../payments/retry-policy.js'
import { PaymentRetryService } from '../services/payment-retry.service.js'

const now = new Date('2026-09-19T12:00:00.000Z')
const expiry = new Date('2026-09-19T20:00:00.000Z')
const job = (attempts = 0): PaymentJob => ({ attemptId: 'attempt-1', attempts, id: 'job-1', leaseExpiresAt: '2026-09-19T12:05:00.000Z', operation: 'reconcile_order', reservationExpiresAt: expiry.toISOString(), resourceId: null })

describe('payment retry and manual-review boundary', () => {
  it('uses the 1/2/4/8/15 minute schedule with bounded jitter', () => {
    for (const [index, minutes] of PAYMENT_RETRY_DELAYS_MINUTES.entries()) {
      const result = schedulePaymentRetry(index, now, expiry, 0.5)
      expect(result.disposition).toBe('retry')
      expect(result.availableAt?.getTime()).toBe(now.getTime() + minutes * 60_000)
    }
  })

  it('continues with 45-minute reconciliation and schedules the final query before expiry', () => {
    const lateExpiry = new Date('2026-09-19T20:00:00.000Z')
    expect([1, 2, 3, 4, 5].map((attempts) => schedulePaymentReconciliation(attempts, now, lateExpiry).availableAt?.getTime()))
      .toEqual([1, 2, 4, 8, 15].map((minutes) => now.getTime() + minutes * 60_000))
    expect(schedulePaymentReconciliation(6, now, lateExpiry).availableAt).toEqual(new Date('2026-09-19T12:45:00.000Z'))
    expect(schedulePaymentReconciliation(99, new Date('2026-09-19T19:50:00.000Z'), lateExpiry).availableAt).toEqual(new Date('2026-09-19T19:55:00.000Z'))
  })

  it('dead-letters after five attempts and never schedules a sixth', () => {
    const result = schedulePaymentRetry(MAX_PAYMENT_ATTEMPTS, now, expiry, 0)
    expect(result).toEqual({ attempt: MAX_PAYMENT_ATTEMPTS + 1, availableAt: null, disposition: 'dead_letter' })
  })

  it('routes a lease/update race to manual review instead of retrying blindly', async () => {
    const repository = { recordFailure: vi.fn(async () => false), recordManualReview: vi.fn(async () => true), claim: vi.fn() }
    const result = await new PaymentRetryService(repository).fail(job(), 'provider\u0000timeout', now, 0.5)
    expect(result.disposition).toBe('manual_review')
    expect(repository.recordFailure).toHaveBeenCalledWith('job-1', expect.objectContaining({ error: 'provider timeout' }), 'legacy-worker')
  })

  it('does not process a duplicate claim when the durable claim returns no second job', async () => {
    const repository = { claim: vi.fn().mockResolvedValueOnce(job()).mockResolvedValueOnce(null), recordFailure: vi.fn(), recordManualReview: vi.fn() }
    const service = new PaymentRetryService(repository)
    await expect(service.claim()).resolves.toMatchObject({ id: 'job-1' })
    await expect(service.claim()).resolves.toBeNull()
    expect(repository.claim).toHaveBeenCalledTimes(2)
  })

  it('allows only sanitized acknowledge/retry manual-review actions', async () => {
    const repository = { recordFailure: vi.fn(async () => true), recordManualReview: vi.fn(async () => true), claim: vi.fn() }
    const service = new PaymentRetryService(repository)
    await expect(service.review('job-1', 'acknowledge', '  checked\nby on-call  ')).resolves.toBe(true)
    expect(repository.recordManualReview).toHaveBeenCalledWith('job-1', 'checked by on-call')
    await expect(service.review('job-1', 'retry', 'retry')).resolves.toBe(true)
    expect(repository.recordFailure).toHaveBeenCalledWith('job-1', expect.objectContaining({ disposition: 'retry' }))
  })
})
