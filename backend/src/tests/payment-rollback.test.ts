import { createHmac } from 'node:crypto'

import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { MercadoPagoConfig } from '../payments/config.js'
import type { IPaymentInboxRepository } from '../repositories/payment-inbox.repository.js'
import type { IPaymentJobsRepository, PaymentJob } from '../repositories/payment-jobs.repository.js'
import type { IPaymentReconciliationRepository } from '../repositories/payment-reconciliation.repository.js'
import type { IPaymentReservationsRepository } from '../repositories/payment-reservations.repository.js'
import { PaymentReconciliationService } from '../services/payment-reconciliation.service.js'
import { PaymentRetryService } from '../services/payment-retry.service.js'
import { PaymentWebhookService } from '../services/payment-webhook.service.js'
import { PaymentWorkerService } from '../services/payment-worker.service.js'
import { TEST_ENV } from './test-helpers.js'

const WEBHOOK_SECRET = 'rollback-test-webhook-secret-with-32-chars'
const logger = pino({ enabled: false })
// Rollback state: the feature flag is off, so there is no provider adapter.
const DISABLED_CONFIG: MercadoPagoConfig = { ...TEST_ENV.mercadoPago, enabled: false, webhookSecret: WEBHOOK_SECRET }

function webhookJob(overrides: Partial<PaymentJob> = {}): PaymentJob {
  return {
    attemptId: null,
    attempts: 1,
    id: 'job-1',
    leaseExpiresAt: '2026-09-19T12:05:00.000Z',
    leaseOwner: 'worker-a',
    operation: 'reconcile_order',
    reservationExpiresAt: new Date(Date.now() + 6 * 3_600_000).toISOString(),
    resourceId: 'payment-1',
    ...overrides,
  }
}

interface IRollbackWorkerSetup {
  alerts: { notify: ReturnType<typeof vi.fn> }
  complete: ReturnType<typeof vi.fn>
  reconciliationRepository: IPaymentReconciliationRepository
  reservations: IPaymentReservationsRepository
  worker: PaymentWorkerService
}

function createWorker(job: PaymentJob): IRollbackWorkerSetup {
  const complete = vi.fn().mockResolvedValue(true)
  const jobs: IPaymentJobsRepository = {
    claim: vi.fn().mockResolvedValueOnce(job).mockResolvedValueOnce(null),
    complete,
    recordFailure: vi.fn(),
    recordManualReview: vi.fn(),
  }
  const reservations: IPaymentReservationsRepository = {
    releaseExpired: vi.fn().mockResolvedValue({ approved: 0, examined: 1, released: 1 }),
  }
  const reconciliationRepository = {
    findExpiredAttempts: vi.fn().mockResolvedValue([{ id: 'attempt-expired' }]),
  } as unknown as IPaymentReconciliationRepository
  const alerts = { notify: vi.fn() }
  const reconciliation = new PaymentReconciliationService(reconciliationRepository, null, DISABLED_CONFIG, logger)
  const worker = new PaymentWorkerService(new PaymentRetryService(jobs), reconciliation, reservations, logger, alerts)

  return { alerts, complete, reconciliationRepository, reservations, worker }
}

function signedWebhook(resourceId: string, requestId: string): { signature: string } {
  const timestamp = Math.floor(Date.now() / 1000)
  const manifest = `id:${resourceId};request-id:${requestId};ts:${timestamp};`
  return { signature: `ts=${timestamp},v1=${createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex')}` }
}

describe('Mercado Pago rollback (flag off)', () => {
  it('keeps accepting and storing signed notifications so none is lost', async () => {
    const acknowledge = vi.fn().mockResolvedValue({ duplicate: false })
    const inbox: IPaymentInboxRepository = { acknowledge }
    const service = new PaymentWebhookService(inbox, DISABLED_CONFIG, logger)
    const { signature } = signedWebhook('payment-1', 'request-1')

    await expect(service.receive({
      body: Buffer.from(JSON.stringify({ data: { id: 'payment-1' }, type: 'payment' })),
      requestId: 'request-1',
      signature,
    })).resolves.toEqual({ duplicate: false })
    expect(acknowledge).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'request-1', resourceId: 'payment-1' }))
  })

  it('still releases expired reservations even though the provider cannot be asked', async () => {
    const { reconciliationRepository, reservations, worker } = createWorker(webhookJob())

    const result = await worker.run('worker-a')

    expect(reconciliationRepository.findExpiredAttempts).toHaveBeenCalled()
    expect(reservations.releaseExpired).toHaveBeenCalledTimes(1)
    expect(result.expiredReservations).toBe(1)
  })

  it('keeps a stored notification pending for a later retry instead of losing or failing it', async () => {
    const { alerts, complete, worker } = createWorker(webhookJob())

    const result = await worker.run('worker-a')

    expect(result).toMatchObject({ claimed: 1, completed: 0, failed: 1 })
    expect(complete).toHaveBeenCalledTimes(1)
    const [jobId, workerId, status, availableAt, reason] = complete.mock.calls[0] as unknown[]
    expect([jobId, workerId, status]).toEqual(['job-1', 'worker-a', 'pending'])
    expect(availableAt).toBeInstanceOf(Date)
    expect(String(reason)).toContain('Mercado Pago no está disponible')
    expect(alerts.notify).not.toHaveBeenCalled()
  })

  it('escalates to manual review, never to success, when the reconciliation window has already closed', async () => {
    const { alerts, complete, worker } = createWorker(
      webhookJob({ attempts: 3, reservationExpiresAt: new Date(Date.now() - 60_000).toISOString() }),
    )

    await worker.run('worker-a')

    const [, , status, availableAt] = complete.mock.calls[0] as unknown[]
    expect(status).toBe('manual_review')
    expect(availableAt).toBeNull()
    expect(alerts.notify).toHaveBeenCalled()
  })
})
