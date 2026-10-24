import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { IPaymentJobsRepository, PaymentJob } from '../repositories/payment-jobs.repository.js'
import type { IPaymentReservationsRepository } from '../repositories/payment-reservations.repository.js'
import { PaymentRetryService } from '../services/payment-retry.service.js'
import { createPaymentIdempotencyKey } from '../payments/idempotency.js'
import { PaymentWorkerScheduler } from '../services/payment-worker-scheduler.service.js'
import { PaymentWorkerService } from '../services/payment-worker.service.js'
import { validatePaymentScheduler } from '../services/payment-scheduler-policy.js'

const job: PaymentJob = {
  attemptId: 'attempt-1',
  attempts: 1,
  id: 'job-1',
  leaseExpiresAt: '2026-09-19T12:05:00.000Z',
  leaseOwner: 'worker-a',
  operation: 'reconcile_order',
  reservationExpiresAt: '2099-09-19T20:00:00.000Z',
  resourceId: null,
}

function reservations(): IPaymentReservationsRepository {
  return { releaseExpired: vi.fn().mockResolvedValue({ examined: 0, released: 0, approved: 0 }) }
}

function repository(): IPaymentJobsRepository {
  return {
    claim: vi.fn().mockResolvedValueOnce(job).mockResolvedValueOnce(null),
    complete: vi.fn().mockResolvedValue(true),
    recordFailure: vi.fn(),
    recordManualReview: vi.fn(),
  }
}

describe('protected payment worker boundary', () => {
  it('reconciles a claimed job and completes it with its owner', async () => {
    const jobs = repository()
    const reconciliation = { reconcile: vi.fn().mockResolvedValue({}), reconcilePayment: vi.fn() }
    const alerts = { notify: vi.fn() }
    const worker = new PaymentWorkerService(new PaymentRetryService(jobs), reconciliation, reservations(), pino({ enabled: false }), alerts)

    await expect(worker.run('worker-a')).resolves.toEqual({ claimed: 1, completed: 1, failed: 0, expiredReservations: 0, expiredReservationsApproved: 0, expiredReservationsExamined: 0 })
    expect(jobs.claim).toHaveBeenCalledWith('worker-a')
    expect(jobs.complete).toHaveBeenCalledWith('job-1', 'worker-a', 'succeeded', null, undefined)
    expect(reconciliation.reconcile).toHaveBeenCalledWith('attempt-1')
  })

  it('does not process a second job when the durable claim returns none', async () => {
    const jobs = repository()
    const worker = new PaymentWorkerService(
      new PaymentRetryService(jobs),
      { reconcile: vi.fn().mockResolvedValue({}), reconcilePayment: vi.fn() },
      reservations(),
      pino({ enabled: false }),
      { notify: vi.fn() },
    )
    await worker.run('worker-a')
    expect(jobs.claim).toHaveBeenCalledTimes(2)
  })

  it('keeps a pending payment on the same durable job for the next cadence', async () => {
    const jobs = repository()
    const reconciliation = { reconcile: vi.fn().mockResolvedValue({ status: 'pending' }), reconcilePayment: vi.fn() }
    const worker = new PaymentWorkerService(
      new PaymentRetryService(jobs),
      reconciliation,
      reservations(),
      pino({ enabled: false }),
      { notify: vi.fn() },
    )

    await worker.run('worker-a')

    expect(jobs.complete).toHaveBeenCalledWith(
      'job-1',
      'worker-a',
      'pending',
      expect.any(Date),
      undefined,
    )
  })

  it('reschedules reconciliation provider failures instead of dead-lettering them', async () => {
    const jobs = repository()
    const reconciliation = { reconcile: vi.fn().mockRejectedValue(new Error('provider timeout')), reconcilePayment: vi.fn() }
    const worker = new PaymentWorkerService(
      new PaymentRetryService(jobs),
      reconciliation,
      reservations(),
      pino({ enabled: false }),
      { notify: vi.fn() },
    )

    await worker.run('worker-a')

    expect(jobs.complete).toHaveBeenCalledWith('job-1', 'worker-a', 'pending', expect.any(Date), 'provider timeout')
    expect(jobs.recordFailure).not.toHaveBeenCalled()
  })

  it('returns the bounded expired-reservation batch counts', async () => {
    const jobs = repository()
    const expiry = { examined: 3, released: 2, approved: 1 }
    const reservationRepository = { releaseExpired: vi.fn().mockResolvedValue(expiry) }
    const worker = new PaymentWorkerService(
      new PaymentRetryService(jobs),
      { reconcile: vi.fn().mockResolvedValue({}), reconcilePayment: vi.fn() },
      reservationRepository,
      pino({ enabled: false }),
      { notify: vi.fn() },
    )

    await expect(worker.run('worker-a', 10)).resolves.toMatchObject({
      expiredReservations: 2,
      expiredReservationsApproved: 1,
      expiredReservationsExamined: 3,
    })
    expect(reservationRepository.releaseExpired).toHaveBeenCalledWith(10)
  })

  it('preserves idempotent expiry counts across repeated worker runs', async () => {
    const jobs = {
      ...repository(),
      claim: vi.fn().mockResolvedValue(null),
    }
    const reservationRepository = {
      releaseExpired: vi.fn()
        .mockResolvedValueOnce({ examined: 1, released: 1, approved: 0 })
        .mockResolvedValueOnce({ examined: 0, released: 0, approved: 0 }),
    }
    const worker = new PaymentWorkerService(
      new PaymentRetryService(jobs),
      { reconcile: vi.fn(), reconcilePayment: vi.fn() },
      reservationRepository,
      pino({ enabled: false }),
      { notify: vi.fn() },
    )

    await expect(worker.run('worker-a')).resolves.toMatchObject({ expiredReservations: 1, expiredReservationsExamined: 1 })
    await expect(worker.run('worker-a')).resolves.toMatchObject({ expiredReservations: 0, expiredReservationsExamined: 0 })
    expect(reservationRepository.releaseExpired).toHaveBeenCalledTimes(2)
  })

  it('maps a payment webhook resource to reconciliation without an attempt id', async () => {
    const webhookJob = { ...job, attemptId: null, resourceId: 'payment-1' }
    const jobs = {
      ...repository(),
      claim: vi.fn().mockResolvedValueOnce(webhookJob).mockResolvedValueOnce(null),
    }
    const reconciliation = { reconcile: vi.fn(), reconcilePayment: vi.fn().mockResolvedValue({}) }
    const worker = new PaymentWorkerService(new PaymentRetryService(jobs), reconciliation, reservations(), pino({ enabled: false }), { notify: vi.fn() })

    await expect(worker.run('worker-a')).resolves.toMatchObject({ claimed: 1, completed: 1 })
    expect(reconciliation.reconcile).not.toHaveBeenCalled()
    expect(reconciliation.reconcilePayment).toHaveBeenCalledWith('payment-1')
  })

  it('rejects cadence below one minute and suppresses overlapping ticks', async () => {
    const run = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 10)))
    const worker = { run }
    const scheduler = new PaymentWorkerScheduler(worker as unknown as PaymentWorkerService, { cadenceSeconds: 60, enabled: true, workerId: 'worker-a' })
    const first = scheduler.tick()
    await expect(scheduler.tick()).resolves.toBeNull()
    await first
    expect(run).toHaveBeenCalledTimes(1)
    expect(() => new PaymentWorkerScheduler(worker as unknown as PaymentWorkerService, { cadenceSeconds: 59, enabled: true, workerId: 'worker-a' })).toThrow()
  })

  it('recovers a preference outbox operation with the stable provider idempotency key', async () => {
    const outboxOperation = {
      attempts: 1,
      availableAt: '2026-09-19T12:00:00.000Z',
      id: 'outbox-1',
      idempotencyKey: 'checkout-key-123456',
      leaseExpiresAt: '2026-09-19T12:05:00.000Z',
      leaseOwner: 'worker-a',
      operation: 'create_order' as const,
      payload: { attempt_id: 'attempt-1' },
      reservationExpiresAt: '2099-09-19T20:00:00.000Z',
      attemptId: 'attempt-1',
    }
    const outbox = {
      claim: vi.fn().mockResolvedValueOnce(outboxOperation).mockResolvedValueOnce(null),
      complete: vi.fn().mockResolvedValue(true),
      recordFailure: vi.fn(),
    }
    const provider = {
      createPreference: vi.fn().mockResolvedValue({ checkoutUrl: 'https://checkout.test', providerPreferenceId: 'preference-1', providerStatus: 'created' }),
      getPayment: vi.fn(),
    }
    const checkoutRepository = {
      findSnapshot: vi.fn().mockResolvedValue({
        amount: 1500,
        attemptId: 'attempt-1',
        items: [{ currency: 'ARS', quantity: 1, title: 'Paint set', unitPrice: 1500 }],
        orderId: 'order-1',
        orderNumber: 'MAD-1',
      }),
      recordProviderPreference: vi.fn(),
    }
    const worker = new PaymentWorkerService(
      new PaymentRetryService({ claim: vi.fn().mockResolvedValue(null), recordFailure: vi.fn(), recordManualReview: vi.fn() }),
      { reconcile: vi.fn(), reconcilePayment: vi.fn() },
      reservations(),
      pino({ enabled: false }),
      { notify: vi.fn() },
      outbox,
      provider,
      checkoutRepository as never,
      { failureUrl: 'https://shop.test/failure/{orderNumber}', pendingUrl: 'https://shop.test/pending/{orderNumber}', successUrl: 'https://shop.test/success/{orderNumber}' } as never,
    )

    await worker.run('worker-a')

    expect(provider.createPreference).toHaveBeenCalledTimes(1)
    expect(provider.createPreference).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: createPaymentIdempotencyKey('order-1', 'attempt-1', 'create_preference'),
    }))
    expect(checkoutRepository.recordProviderPreference).toHaveBeenCalledWith('attempt-1', expect.stringContaining('margarita:mercado-pago:create_preference:'), expect.anything())
    expect(outbox.complete).toHaveBeenCalledWith('outbox-1', 'worker-a')
  })

  it('keeps a transient provider interruption pending for the next durable lease', async () => {
    const operation = {
      attempts: 1,
      availableAt: '2026-09-19T12:00:00.000Z',
      id: 'outbox-2',
      idempotencyKey: 'checkout-key-123456',
      leaseExpiresAt: '2026-09-19T12:05:00.000Z',
      leaseOwner: 'worker-a',
      operation: 'create_order' as const,
      payload: {},
      reservationExpiresAt: '2099-09-19T20:00:00.000Z',
      attemptId: 'attempt-1',
    }
    const outbox = {
      claim: vi.fn().mockResolvedValueOnce(operation).mockResolvedValueOnce(null),
      complete: vi.fn(),
      recordFailure: vi.fn().mockResolvedValue(true),
    }
    const worker = new PaymentWorkerService(
      new PaymentRetryService({ claim: vi.fn().mockResolvedValue(null), recordFailure: vi.fn(), recordManualReview: vi.fn() }),
      { reconcile: vi.fn(), reconcilePayment: vi.fn() },
      reservations(),
      pino({ enabled: false }),
      { notify: vi.fn() },
      outbox,
      { createPreference: vi.fn().mockRejectedValue(new Error('provider timeout')), getPayment: vi.fn() },
      { findSnapshot: vi.fn().mockResolvedValue({ amount: 1500, attemptId: 'attempt-1', items: [], orderId: 'order-1', orderNumber: 'MAD-1' }) } as never,
      { failureUrl: 'https://shop.test/failure', pendingUrl: 'https://shop.test/pending', successUrl: 'https://shop.test/success' } as never,
    )

    await worker.run('worker-a', 1)

    expect(outbox.complete).not.toHaveBeenCalled()
    expect(outbox.recordFailure).toHaveBeenCalledWith('outbox-2', expect.objectContaining({ disposition: 'retry', availableAt: expect.any(Date) }), 'worker-a')
  })

  it('requires validated HTTP support, quota, and managed approval', () => {
    expect(validatePaymentScheduler({ approved: false, cadenceSeconds: 60, httpSupported: false, plan: 'supabase_free', quotaPerHour: 60 })).toContain('HTTP')
    expect(validatePaymentScheduler({ approved: false, cadenceSeconds: 60, httpSupported: true, plan: 'supabase_free', quotaPerHour: 59 })).toContain('quota')
    expect(validatePaymentScheduler({ approved: false, cadenceSeconds: 60, httpSupported: true, plan: 'managed', quotaPerHour: 60 })).toContain('approval')
  })
})
