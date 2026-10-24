import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { IAdminPaymentRepository } from '../repositories/admin-payments.repository.js'
import { AdminPaymentService } from '../services/admin-payments.service.js'
import type { IPaymentReconciliationService } from '../services/payment-reconciliation.service.js'
import { PaymentRetryService } from '../services/payment-retry.service.js'

const ATTEMPT = {
  amount: 1500,
  attemptNumber: 1,
  createdAt: '2026-09-25T10:00:00.000Z',
  currency: 'ARS',
  id: 'b2c2e6a7-3f1d-4f6f-9a0e-9fbc7d1d9b4b',
  jobId: 'fca4f2e2-7b0f-4f07-b40c-0ab3d37b1c8a',
  jobStatus: 'manual_review',
  lastError: 'Provider timeout',
  orderId: 'a1c2e6a7-3f1d-4f6f-9a0e-9fbc7d1d9b4a',
  orderNumber: 'MAD-0001',
  providerOrderId: null,
  providerPaymentId: 'payment-1',
  providerStatus: 'pending',
  providerUpdatedAt: null,
  reservationExpiresAt: '2026-09-25T10:40:00.000Z',
  status: 'manual_review' as const,
  updatedAt: '2026-09-25T10:05:00.000Z',
}

function createService(overrides: Partial<IAdminPaymentRepository> = {}): {
  repository: IAdminPaymentRepository
  reconciliation: IPaymentReconciliationService
  service: AdminPaymentService
} {
  const repository: IAdminPaymentRepository = {
    findPage: vi.fn().mockResolvedValue({ items: [ATTEMPT], totalItems: 1 }),
    findAuditEvents: vi.fn().mockResolvedValue(new Map()),
    findAttempt: vi.fn().mockResolvedValue(ATTEMPT),
    recordSync: vi.fn().mockResolvedValue(true),
    recordReview: vi.fn().mockResolvedValue(true),
    retryJob: vi.fn().mockResolvedValue(true),
    reviewAttempt: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
  const reconciliation: IPaymentReconciliationService = {
    reconcile: vi.fn().mockResolvedValue({}),
    reconcilePayment: vi.fn(),
  }
  const jobs = {
    claim: vi.fn(),
    recordFailure: vi.fn(),
    recordManualReview: vi.fn(),
    retryForAdmin: vi.fn().mockResolvedValue(true),
  }
  return {
    repository,
    reconciliation,
    service: new AdminPaymentService(repository, reconciliation, new PaymentRetryService(jobs), pino({ enabled: false })),
  }
}

describe('AdminPaymentService', () => {
  it('returns the reconciliation contract with pagination and audit data', async () => {
    const { service } = createService()
    const result = await service.list({ page: 1, pageSize: 10, status: 'manual_review' })

    expect(result).toMatchObject({
      items: [{ auditTimeline: [], id: ATTEMPT.id, status: 'manual_review', canRetry: true, canReview: true, canSync: true }],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    })
  })

  it('records a payment_sync audit event after a successful administrative sync', async () => {
    const { repository, service } = createService()

    expect(await service.sync(ATTEMPT.id, 'actor-1')).toEqual({ auditRecorded: true })

    expect(repository.recordSync).toHaveBeenCalledWith(ATTEMPT.id, 'actor-1')
  })

  it('allows synchronization when only the provider payment identifier is available', async () => {
    const { repository, reconciliation, service } = createService()

    await expect(service.sync(ATTEMPT.id, 'actor-1')).resolves.toEqual({ auditRecorded: true })

    expect(reconciliation.reconcile).toHaveBeenCalledWith(ATTEMPT.id)
    expect(repository.recordSync).toHaveBeenCalledWith(ATTEMPT.id, 'actor-1')
  })

  it('allows unresolved attempts without a provider payment ID to be searched by external reference', async () => {
    const attempt = { ...ATTEMPT, providerPaymentId: null }
    const { repository, reconciliation, service } = createService({
      findAttempt: vi.fn().mockResolvedValue(attempt),
      findPage: vi.fn().mockResolvedValue({ items: [attempt], totalItems: 1 }),
    })

    expect((await service.list({ page: 1, pageSize: 10, status: 'manual_review' })).items[0]?.canSync).toBe(true)
    await service.sync(attempt.id, 'actor-1')

    expect(reconciliation.reconcile).toHaveBeenCalledWith(attempt.id)
    expect(repository.recordSync).toHaveBeenCalledWith(attempt.id, 'actor-1')
  })

  it('does not audit a failed provider lookup as a successful sync', async () => {
    const { repository, reconciliation, service } = createService()
    vi.mocked(reconciliation.reconcile).mockRejectedValueOnce(new Error('Provider unavailable'))

    await expect(service.sync(ATTEMPT.id, 'actor-1')).rejects.toThrow('Provider unavailable')
    expect(repository.recordSync).not.toHaveBeenCalled()
  })

  it.each(['rejected', 'throw'] as const)('keeps a completed reconciliation truthful when audit %s', async (outcome) => {
    const recordSync = outcome === 'throw'
      ? vi.fn().mockRejectedValue(new Error('Audit unavailable'))
      : vi.fn().mockResolvedValue(false)
    const { reconciliation, service } = createService({ recordSync })

    await expect(service.sync(ATTEMPT.id, 'actor-1')).resolves.toEqual({ auditRecorded: false })
    expect(reconciliation.reconcile).toHaveBeenCalledWith(ATTEMPT.id)
    expect(recordSync).toHaveBeenCalledWith(ATTEMPT.id, 'actor-1')
  })

  it('keeps synchronization restricted to pending and manual review states', async () => {
    const { service } = createService({
      findAttempt: vi.fn().mockResolvedValue({ ...ATTEMPT, status: 'approved' }),
    })

    await expect(service.sync(ATTEMPT.id, 'actor-1')).rejects.toMatchObject({ code: 'PAYMENT_SYNC_NOT_ALLOWED' })
  })

  it.each([
    ['retry', async (service: AdminPaymentService): Promise<void> => service.retry(ATTEMPT.id, 'actor-1')],
    ['sync', async (service: AdminPaymentService): Promise<void> => { await service.sync(ATTEMPT.id, 'actor-1') }],
    ['review', async (service: AdminPaymentService): Promise<void> => service.review(ATTEMPT.id, { decision: 'acknowledge', note: 'Checked manually' }, 'actor-1')],
  ])('authorizes the %s action for manual review', async (_action, operation) => {
    await expect(operation(createService().service)).resolves.toBeUndefined()
  })

  it('rejects review acknowledgement without a note', async () => {
    const { service } = createService()

    await expect(service.review(ATTEMPT.id, { decision: 'acknowledge' }, 'actor-1')).rejects.toMatchObject({
      code: 'PAYMENT_REVIEW_NOTE_REQUIRED',
    })
  })

  it('rejects retry from an approved state', async () => {
    const { service } = createService({ findAttempt: vi.fn().mockResolvedValue({ ...ATTEMPT, status: 'approved' }) })

    await expect(service.retry(ATTEMPT.id, 'actor-1')).rejects.toMatchObject({ code: 'PAYMENT_RETRY_NOT_ALLOWED' })
  })
})
