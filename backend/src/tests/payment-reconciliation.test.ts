import { describe, expect, it, vi } from 'vitest'

import { loadMercadoPagoConfig } from '../payments/config.js'
import type { PaymentProvider, ProviderPayment, ReconciledPaymentState } from '../payments/types.js'
import type { IPaymentReconciliationRepository, PaymentTransactionRecord, PaymentTransition } from '../repositories/payment-reconciliation.repository.js'
import { PaymentReconciliationService } from '../services/payment-reconciliation.service.js'

const config = { ...loadMercadoPagoConfig({ NODE_ENV: 'development', MP_ENABLED: '1', MP_ACCESS_TOKEN: 'token', MP_WEBHOOK_SECRET: 'a'.repeat(32) }), enabled: true, validationError: null }
const logger = { warn: vi.fn() } as never
const payment = (overrides: Partial<ProviderPayment> = {}): ProviderPayment => ({
  amount: 1500,
  currency: 'ARS',
  externalReference: 'ORD-1',
  id: 'payment-1',
  paymentTypeId: 'debit_card',
  status: 'approved',
  updatedAt: '2026-09-18T20:00:00.000Z',
  version: 2,
  ...overrides,
})

function create(status: 'pending' | 'approved' = 'pending'): {
  repository: {
    findAttempt: ReturnType<typeof vi.fn<IPaymentReconciliationRepository['findAttempt']>>
    findExpiredAttempts: ReturnType<typeof vi.fn<IPaymentReconciliationRepository['findExpiredAttempts']>>
    transition: ReturnType<typeof vi.fn<IPaymentReconciliationRepository['transition']>>
  }
  provider: PaymentProvider
  service: PaymentReconciliationService
} {
  const transition = vi.fn<IPaymentReconciliationRepository['transition']>(async () => 'applied' as const)
  const repository = {
    findAttempt: vi.fn<IPaymentReconciliationRepository['findAttempt']>(async () => ({ amount: 1500, currency: 'ARS', externalReference: 'ORD-1', id: 'attempt-1', orderId: 'order-1', providerPreferenceId: 'preference-1', providerPaymentId: 'payment-1', providerVersion: status === 'pending' ? 1 : 2, status })),
    findExpiredAttempts: vi.fn<IPaymentReconciliationRepository['findExpiredAttempts']>(async () => []),
    findAttemptByExternalReference: vi.fn(),
    recordProviderPaymentId: vi.fn(),
    transition,
  }
  const provider: PaymentProvider = { createPreference: vi.fn(), getPayment: vi.fn(async () => payment()) }
  return { repository, provider, service: new PaymentReconciliationService(repository, provider, config, logger) }
}

describe('authenticated provider reconciliation boundary', () => {
  it.each(['periodic', 'final_expiry'] as const)('discovers a missed approved retry during %s with an old rejected ID', async (operation) => {
    const attempt = { amount: 1500, currency: 'ARS', externalReference: 'ORD-1', id: 'attempt-1',
      orderId: 'order-1', providerPreferenceId: 'preference-1', providerPaymentId: 'old-rejected',
      providerVersion: null, status: 'rejected' as const }
    let paid = false
    const repository = {
      findAttempt: vi.fn(async () => attempt),
      findExpiredAttempts: vi.fn(async () => [attempt]),
      findAttemptByExternalReference: vi.fn(), recordProviderPaymentId: vi.fn(),
      recordProviderLookupState: vi.fn(), transition: vi.fn(),
      findProviderTransaction: vi.fn(async () => null),
      upsertProviderTransaction: vi.fn(async (_id: string, _environment: string, providerPayment: ProviderPayment) => ({
        amount: providerPayment.amount, currency: providerPayment.currency, id: providerPayment.id,
        paymentAttemptId: attempt.id, paymentTypeId: providerPayment.paymentTypeId,
        providerPaymentId: providerPayment.id, providerStatus: providerPayment.status,
        providerUpdatedAt: providerPayment.updatedAt, providerVersion: null, reviewRequired: false,
        status: providerPayment.status as 'approved' | 'rejected', updatedAt: '2026-09-18T20:00:00.000Z',
      })),
      transitionProviderTransaction: vi.fn(async (_transaction: PaymentTransactionRecord, transition: PaymentTransition) => {
        if (transition.status === 'approved') paid = true
        return { transition: 'applied' as const, status: paid ? 'approved' as const : 'rejected' as const }
      }),
    }
    const provider: PaymentProvider = {
      createPreference: vi.fn(), getPayment: vi.fn(),
      getPaymentsByExternalReference: vi.fn(async () => [
        payment({ id: 'missed-approved', version: null }),
        payment({ id: 'old-rejected', status: 'rejected', version: null }),
      ]),
    }
    const service = new PaymentReconciliationService(repository, provider, config, logger)
    if (operation === 'final_expiry') await service.reconcileExpiredReservations(10)
    else await expect(service.reconcile(attempt.id)).resolves.toMatchObject({ status: 'approved' })
    expect(provider.getPaymentsByExternalReference).toHaveBeenCalledWith(attempt.externalReference)
    expect(repository.upsertProviderTransaction).toHaveBeenCalledTimes(2)
    expect(repository.transitionProviderTransaction).toHaveBeenCalledTimes(2)
    expect(paid).toBe(true)
    expect(repository.transition).not.toHaveBeenCalled()
  })

  it('does not treat a failed retry search as no payment when an old ID exists', async () => {
    const { provider, repository } = create()
    const recordProviderLookupState = vi.fn()
    provider.getPaymentsByExternalReference = vi.fn(async () => { throw new Error('search failed') })
    const service = new PaymentReconciliationService({ ...repository, recordProviderLookupState,
      findAttemptByExternalReference: vi.fn(), recordProviderPaymentId: vi.fn(),
    }, provider, config, logger)
    await expect(service.reconcile('attempt-1')).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_UNAVAILABLE' })
    expect(recordProviderLookupState).toHaveBeenCalledWith('attempt-1', 'unavailable')
    expect(provider.getPayment).not.toHaveBeenCalled()
  })
  it('searches by external reference when the webhook has not supplied a payment ID', async () => {
    const { provider } = create()
    const repository = {
      findAttempt: vi.fn(async () => ({
        amount: 1500,
        currency: 'ARS',
        externalReference: 'ORD-1',
        id: 'attempt-1',
        orderId: 'order-1',
        providerPreferenceId: 'preference-1',
        providerPaymentId: null,
        providerVersion: null,
        status: 'pending' as const,
      })),
      findExpiredAttempts: vi.fn(async () => []),
      findAttemptByExternalReference: vi.fn(),
      recordProviderPaymentId: vi.fn(),
      recordProviderLookupState: vi.fn(),
      transition: vi.fn(),
    }
    vi.mocked(provider.getPayment).mockRejectedValue(new Error('must not use payment lookup without an id'))
    provider.getPaymentsByExternalReference = vi.fn(async () => [])
    const isolated = new PaymentReconciliationService(repository, provider, config, logger)

    await expect(isolated.reconcile('attempt-1')).resolves.toMatchObject({ status: 'pending', transition: 'stale', providerStatus: 'not_found' })
    expect(provider.getPaymentsByExternalReference).toHaveBeenCalledWith('ORD-1')
    expect(provider.getPayment).not.toHaveBeenCalled()
    expect(repository.recordProviderLookupState).toHaveBeenCalledWith('attempt-1', 'not_found')
  })

  it('persists provider unavailability separately from a definitive no-payment result', async () => {
    const { provider } = create()
    const repository = {
      findAttempt: vi.fn(async () => ({
        amount: 1500,
        currency: 'ARS',
        externalReference: 'ORD-1',
        id: 'attempt-1',
        orderId: 'order-1',
        providerPreferenceId: 'preference-1',
        providerPaymentId: null,
        providerVersion: null,
        status: 'pending' as const,
      })),
      findExpiredAttempts: vi.fn(async () => []),
      findAttemptByExternalReference: vi.fn(),
      recordProviderPaymentId: vi.fn(),
      recordProviderLookupState: vi.fn(),
      transition: vi.fn(),
    }
    provider.getPaymentsByExternalReference = vi.fn(async () => { throw new Error('provider unavailable') })
    const service = new PaymentReconciliationService(repository, provider, config, logger)

    await expect(service.reconcile('attempt-1')).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_UNAVAILABLE' })
    expect(repository.recordProviderLookupState).toHaveBeenCalledWith('attempt-1', 'unavailable')
  })

  it('applies an approved payment found by external reference through the normal idempotent path', async () => {
    const { repository, provider, service } = create()
    repository.findAttempt.mockResolvedValue({
      amount: 1500,
      currency: 'ARS',
      externalReference: 'ORD-1',
      id: 'attempt-1',
      orderId: 'order-1',
      providerPreferenceId: 'preference-1',
      providerPaymentId: null,
      providerVersion: null,
      status: 'pending',
    })
    provider.getPaymentsByExternalReference = vi.fn(async () => [payment()])

    await expect(service.reconcile('attempt-1')).resolves.toMatchObject({ status: 'approved', transition: 'applied' })
    expect(repository.transition).toHaveBeenCalledWith(expect.objectContaining({ providerPaymentId: 'payment-1' }), expect.objectContaining({ status: 'approved' }))
  })

  it.each([
    ['no payment', [] as ProviderPayment[]],
    ['an approved payment', [payment()]],
    ['a rejected payment', [payment({ status: 'rejected' })]],
  ])('consults by external reference without creating a charge or touching the reservation expiry when it finds %s', async (_label, found) => {
    const { provider } = create()
    const repository = {
      findAttempt: vi.fn(async () => ({
        amount: 1500, currency: 'ARS', externalReference: 'ORD-1', id: 'attempt-1', orderId: 'order-1',
        providerPreferenceId: 'preference-1', providerPaymentId: null, providerVersion: null, status: 'pending' as const,
      })),
      findExpiredAttempts: vi.fn(async () => []),
      findAttemptByExternalReference: vi.fn(),
      recordProviderPaymentId: vi.fn(),
      recordProviderLookupState: vi.fn(),
      transition: vi.fn(async () => 'applied' as const),
    }
    provider.getPaymentsByExternalReference = vi.fn(async () => found)
    const isolated = new PaymentReconciliationService(repository, provider, config, logger)

    await isolated.reconcile('attempt-1')

    expect(provider.createPreference).not.toHaveBeenCalled()
    expect(provider.getPayment).not.toHaveBeenCalled()
    const writes = JSON.stringify([
      repository.transition.mock.calls, repository.recordProviderPaymentId.mock.calls, repository.recordProviderLookupState.mock.calls,
    ])
    expect(writes).not.toMatch(/reservation|expires/i)
  })

  it('does not report an approved result when the external reference search finds only a rejected payment', async () => {
    const { repository, provider, service } = create()
    repository.findAttempt.mockResolvedValue({
      amount: 1500, currency: 'ARS', externalReference: 'ORD-1', id: 'attempt-1', orderId: 'order-1',
      providerPreferenceId: 'preference-1', providerPaymentId: null, providerVersion: null, status: 'pending',
    })
    provider.getPaymentsByExternalReference = vi.fn(async () => [payment({ status: 'rejected' })])

    const result = await service.reconcile('attempt-1')

    expect(result.status).not.toBe('approved')
    expect(repository.transition).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'approved' }))
  })

  it('normalizes a matching approved GET and persists it once', async () => {
    const { repository, service } = create()
    await expect(service.reconcile('attempt-1')).resolves.toMatchObject({ status: 'approved', transition: 'applied' })
    expect(repository.transition).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'approved' }))
  })

  it('resolves a legacy merchant order to its payment before applying the normal transition', async () => {
    const attempt = {
      amount: 1500,
      currency: 'ARS',
      externalReference: 'ORD-1',
      id: 'attempt-1',
      orderId: 'order-1',
      providerPreferenceId: 'preference-1',
      providerPaymentId: 'payment-1',
      providerVersion: 1,
      status: 'pending' as const,
    }
    const repository = {
      findAttempt: vi.fn(),
      findExpiredAttempts: vi.fn(async () => []),
      findAttemptByExternalReference: vi.fn(async () => attempt),
      recordProviderPaymentId: vi.fn(),
      recordProviderLookupState: vi.fn(),
      transition: vi.fn(async () => 'applied' as const),
    }
    const provider: PaymentProvider = {
      createPreference: vi.fn(),
      getMerchantOrderPaymentId: vi.fn(async () => 'payment-1'),
      getPayment: vi.fn(async () => payment()),
    }
    const service = new PaymentReconciliationService(repository, provider, config, logger)

    await expect(service.reconcileMerchantOrder('merchant-order-1')).resolves.toMatchObject({ status: 'approved' })
    expect(provider.getMerchantOrderPaymentId).toHaveBeenCalledWith('merchant-order-1')
    expect(provider.getPayment).toHaveBeenCalledWith('payment-1')
  })

  it('keeps a later provider payment as a transaction of the same preference', async () => {
    const attempt = {
      amount: 1500,
      currency: 'ARS',
      externalReference: 'ORD-1',
      id: 'attempt-1',
      orderId: 'order-1',
      providerPreferenceId: 'preference-1',
      providerPaymentId: 'payment-1',
      providerVersion: 1,
      status: 'pending' as const,
    }
    const repository = {
      findAttempt: vi.fn(async () => attempt),
      findExpiredAttempts: vi.fn(async () => []),
      findAttemptByExternalReference: vi.fn(async () => attempt),
      recordProviderPaymentId: vi.fn(),
      findProviderTransaction: vi.fn(async () => null),
      listProviderTransactions: vi.fn(async () => []),
      upsertProviderTransaction: vi.fn(async () => ({
        amount: 1500,
        currency: 'ARS',
        id: 'transaction-2',
        paymentAttemptId: 'attempt-1',
        paymentTypeId: 'debit_card',
        providerPaymentId: 'payment-2',
        providerStatus: 'approved',
        providerUpdatedAt: '2026-09-18T20:00:00.000Z',
        providerVersion: 2,
        reviewRequired: false,
        status: 'approved' as const,
        updatedAt: '2026-09-18T20:00:00.000Z',
      })),
      transitionProviderTransaction: vi.fn(async () => ({ transition: 'applied' as const, status: 'approved' as const })),
      transition: vi.fn(),
    }
    const provider: PaymentProvider = {
      createPreference: vi.fn(),
      getPayment: vi.fn(async () => payment({ id: 'payment-2', version: 2 })),
    }
    const service = new PaymentReconciliationService(repository, provider, config, logger)

    await expect(service.reconcilePayment('payment-2')).resolves.toMatchObject({ status: 'approved', transition: 'applied' })
    expect(repository.upsertProviderTransaction).toHaveBeenCalledWith(
      'attempt-1',
      config.environment,
      expect.objectContaining({ id: 'payment-2' }),
      false,
      null,
    )
    expect(repository.transition).not.toHaveBeenCalled()
  })

  it('promotes an approved transaction over a rejected transaction of the same attempt', async () => {
    const attempt = {
      amount: 1500,
      currency: 'ARS',
      externalReference: 'ORD-1',
      id: 'attempt-1',
      orderId: 'order-1',
      providerPreferenceId: 'preference-1',
      providerPaymentId: 'payment-rejected',
      providerVersion: 1,
      status: 'rejected' as const,
    }
    const repository = {
      findAttempt: vi.fn(async () => attempt),
      findExpiredAttempts: vi.fn(async () => []),
      findAttemptByExternalReference: vi.fn(async () => attempt),
      recordProviderPaymentId: vi.fn(),
      findProviderTransaction: vi.fn(async () => ({
        amount: 1500,
        currency: 'ARS',
        id: 'transaction-approved',
        paymentAttemptId: 'attempt-1',
        paymentTypeId: 'debit_card',
        providerPaymentId: 'payment-approved',
        providerStatus: 'rejected',
        providerUpdatedAt: '2026-09-18T19:00:00.000Z',
        providerVersion: 1,
        reviewRequired: false,
        status: 'rejected' as const,
        updatedAt: '2026-09-18T19:00:00.000Z',
      })),
      upsertProviderTransaction: vi.fn(),
      transitionProviderTransaction: vi.fn(async () => ({ transition: 'applied' as const, status: 'approved' as const })),
      transition: vi.fn(),
    }
    const provider: PaymentProvider = {
      createPreference: vi.fn(),
      getPayment: vi.fn(async () => payment({ id: 'payment-approved', version: 2 })),
    }
    const service = new PaymentReconciliationService(repository, provider, config, logger)

    await expect(service.reconcilePayment('payment-approved')).resolves.toMatchObject({
      status: 'approved',
      transition: 'applied',
    })
    expect(repository.transitionProviderTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' }),
      expect.objectContaining({ status: 'approved' }),
      false,
      null,
    )
    expect(repository.transition).not.toHaveBeenCalled()
  })

  it('keeps a fully approved aggregate when a later provider transaction is rejected', async () => {
    const attempt = {
      amount: 1500,
      currency: 'ARS',
      externalReference: 'ORD-1',
      id: 'attempt-1',
      orderId: 'order-1',
      providerPreferenceId: 'preference-1',
      providerPaymentId: 'payment-approved',
      providerVersion: 2,
      status: 'approved' as const,
    }
    const repository = {
      findAttempt: vi.fn(async () => attempt),
      findExpiredAttempts: vi.fn(async () => []),
      findAttemptByExternalReference: vi.fn(async () => attempt),
      recordProviderPaymentId: vi.fn(),
      findProviderTransaction: vi.fn(async () => ({
        amount: 1500,
        currency: 'ARS',
        id: 'transaction-later-rejected',
        paymentAttemptId: 'attempt-1',
        paymentTypeId: 'debit_card',
        providerPaymentId: 'payment-later-rejected',
        providerStatus: 'pending',
        providerUpdatedAt: '2026-09-18T20:00:00.000Z',
        providerVersion: 1,
        reviewRequired: false,
        status: 'pending' as const,
        updatedAt: '2026-09-18T20:00:00.000Z',
      })),
      upsertProviderTransaction: vi.fn(),
      transitionProviderTransaction: vi.fn(async () => ({ transition: 'applied' as const, status: 'approved' as const })),
      transition: vi.fn(),
    }
    const provider: PaymentProvider = {
      createPreference: vi.fn(),
      getPayment: vi.fn(async () => payment({ id: 'payment-later-rejected', status: 'rejected', version: 2 })),
    }
    const service = new PaymentReconciliationService(repository, provider, config, logger)

    await expect(service.reconcilePayment('payment-later-rejected')).resolves.toMatchObject({
      providerStatus: 'rejected',
      status: 'approved',
      transition: 'applied',
    })
    expect(repository.transitionProviderTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
      expect.objectContaining({ status: 'rejected' }),
      false,
      null,
    )
  })

  it.each([
    ['amount', { amount: 1501 }],
    ['currency', { currency: 'USD' }],
    ['identity', { externalReference: 'ORD-2' }],
    ['type', { paymentTypeId: 'credit_card' }],
  ])('quarantines a %s mismatch without advancing payment', async (_name, mismatch) => {
    const { repository, provider, service } = create()
    vi.mocked(provider.getPayment).mockResolvedValue(payment(mismatch))
    await expect(service.reconcile('attempt-1')).resolves.toMatchObject({ status: 'manual_review', transition: 'manual_review' })
    expect(repository.transition).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'manual_review' }))
  })

  it('does not regress an approved attempt when an older GET arrives', async () => {
    const { service } = create('approved')
    await expect(service.reconcile('attempt-1')).resolves.toMatchObject({ status: 'approved', transition: 'stale' })
  })

  it('applies the same provider event once and does not move stock twice', async () => {
    const attempt = { amount: 1500, currency: 'ARS', externalReference: 'ORD-1', id: 'attempt-1', orderId: 'order-1', providerPreferenceId: 'preference-1', providerPaymentId: 'payment-1', providerVersion: 1, status: 'pending' as ReconciledPaymentState }
    const repository = {
       findAttempt: vi.fn(async () => attempt),
       findExpiredAttempts: vi.fn(async () => []),
       findAttemptByExternalReference: vi.fn(),
       recordProviderPaymentId: vi.fn(),
      transition: vi.fn(async (_current, transition) => {
        attempt.providerVersion = transition.providerVersion
        attempt.status = transition.status
        return 'applied' as const
      }),
    }
    const provider: PaymentProvider = { createPreference: vi.fn(), getPayment: vi.fn(async () => payment()) }
    const service = new PaymentReconciliationService(repository, provider, config, logger)

    await expect(service.reconcile('attempt-1')).resolves.toMatchObject({ transition: 'applied' })
    await expect(service.reconcile('attempt-1')).resolves.toMatchObject({ transition: 'stale' })
    expect(repository.transition).toHaveBeenCalledTimes(1)
  })

  it('reconciles a delayed provider approval before reservation expiry can release stock', async () => {
    const attempt = {
      amount: 1500,
      currency: 'ARS',
      externalReference: 'ORD-1',
      id: 'attempt-1',
      orderId: 'order-1',
      providerPreferenceId: 'preference-1',
      providerPaymentId: 'payment-1',
      providerVersion: 1,
      status: 'pending' as const,
    }
    const repository = {
      findAttempt: vi.fn(async () => attempt),
      findExpiredAttempts: vi.fn(async () => [attempt]),
      findAttemptByExternalReference: vi.fn(),
      recordProviderPaymentId: vi.fn(),
      transition: vi.fn(async () => 'applied' as const),
    }
    const provider: PaymentProvider = {
      createPreference: vi.fn(),
      getPayment: vi.fn(async () => payment({ status: 'approved', version: 2 })),
    }
    const service = new PaymentReconciliationService(repository, provider, config, logger)

    await expect(service.reconcileExpiredReservations(10)).resolves.toBeUndefined()
    expect(provider.getPayment).toHaveBeenCalledWith('payment-1')
    expect(repository.transition).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'approved' }))
  })
})

describe('payment still unresolved after the reservation expired', () => {
  const past = (): string => new Date(Date.now() - 60_000).toISOString()
  const future = (): string => new Date(Date.now() + 3_600_000).toISOString()

  type UpsertMock = ReturnType<typeof vi.fn<NonNullable<IPaymentReconciliationRepository['upsertProviderTransaction']>>>
  type TransitionMock = ReturnType<typeof vi.fn<NonNullable<IPaymentReconciliationRepository['transitionProviderTransaction']>>>

  function build(options: {
    existing?: Partial<PaymentTransactionRecord>
    providerPayment: ProviderPayment
    reservationExpiresAt?: string | null
  }): { service: PaymentReconciliationService; transitionProviderTransaction: TransitionMock; upsertProviderTransaction: UpsertMock } {
    const attempt = {
      amount: 1500, currency: 'ARS', externalReference: 'ORD-1', id: 'attempt-1', orderId: 'order-1',
      providerPreferenceId: 'preference-1', providerPaymentId: 'payment-1', providerVersion: null,
      reservationExpiresAt: options.reservationExpiresAt ?? null,
      status: 'pending' as const,
    }
    const record = (overrides: Partial<PaymentTransactionRecord> = {}): PaymentTransactionRecord => ({
      amount: 1500, currency: 'ARS', id: 'transaction-1', paymentAttemptId: attempt.id, paymentTypeId: 'debit_card',
      providerPaymentId: 'payment-1', providerStatus: 'in_process', providerUpdatedAt: '2026-09-18T20:00:00.000Z',
      providerVersion: 3, reviewRequired: false, status: 'pending', updatedAt: '2026-09-18T20:00:00.000Z',
      ...overrides,
    })
    const upsertProviderTransaction = vi.fn<NonNullable<IPaymentReconciliationRepository['upsertProviderTransaction']>>(async () => record())
    const transitionProviderTransaction = vi.fn<NonNullable<IPaymentReconciliationRepository['transitionProviderTransaction']>>(
      async () => ({ transition: 'applied' as const, status: 'pending' as const }),
    )
    const repository = {
      findAttempt: vi.fn(async () => attempt),
      findExpiredAttempts: vi.fn(async () => [attempt]),
      findAttemptByExternalReference: vi.fn(),
      recordProviderPaymentId: vi.fn(),
      findProviderTransaction: vi.fn(async () => (options.existing === undefined ? null : record(options.existing))),
      upsertProviderTransaction,
      transitionProviderTransaction,
      transition: vi.fn(),
    }
    const provider: PaymentProvider = { createPreference: vi.fn(), getPayment: vi.fn(async () => options.providerPayment) }
    return { service: new PaymentReconciliationService(repository, provider, config, logger), transitionProviderTransaction, upsertProviderTransaction }
  }

  it.each(['in_process', 'pending'] as const)('flags a new %s transaction for review once the reservation expired', async (status) => {
    const { service, transitionProviderTransaction, upsertProviderTransaction } = build({
      providerPayment: payment({ status, version: 3 }), reservationExpiresAt: past(),
    })

    await service.reconcile('attempt-1')

    expect(upsertProviderTransaction).toHaveBeenCalledWith('attempt-1', expect.anything(), expect.anything(), true, null)
    expect(transitionProviderTransaction).toHaveBeenCalledWith(expect.anything(), expect.anything(), true, null)
  })

  it.each([
    ['a reservation that is still active', 'in_process', 'active'],
    ['an approved payment', 'approved', 'expired'],
    ['a rejected payment', 'rejected', 'expired'],
    ['an attempt without an expiry value', 'in_process', 'missing'],
  ] as const)('does not flag %s', async (_label, status, expiry) => {
    const reservationExpiresAt = expiry === 'active' ? future() : expiry === 'expired' ? past() : null
    const { service, transitionProviderTransaction, upsertProviderTransaction } = build({
      providerPayment: payment({ status, version: 3 }), reservationExpiresAt,
    })

    await service.reconcile('attempt-1')

    expect(upsertProviderTransaction).toHaveBeenCalledWith('attempt-1', expect.anything(), expect.anything(), false, null)
    expect(transitionProviderTransaction).toHaveBeenCalledWith(expect.anything(), expect.anything(), false, null)
  })

  it('flags an existing transaction even when the provider version did not change', async () => {
    const { service, transitionProviderTransaction } = build({
      existing: { providerVersion: 3, reviewRequired: false },
      providerPayment: payment({ status: 'in_process', version: 3 }),
      reservationExpiresAt: past(),
    })

    await service.reconcile('attempt-1')

    expect(transitionProviderTransaction).toHaveBeenCalledTimes(1)
    expect(transitionProviderTransaction).toHaveBeenCalledWith(expect.anything(), expect.anything(), true, null)
  })

  it('does not rewrite a transaction that is already flagged and unchanged', async () => {
    const { service, transitionProviderTransaction } = build({
      existing: { providerVersion: 3, reviewRequired: true },
      providerPayment: payment({ status: 'in_process', version: 3 }),
      reservationExpiresAt: past(),
    })

    await service.reconcile('attempt-1')

    expect(transitionProviderTransaction).not.toHaveBeenCalled()
  })

  it('keeps flagging a payment whose amount does not match, whatever the expiry', async () => {
    const { service, transitionProviderTransaction } = build({
      providerPayment: payment({ amount: 1, status: 'in_process', version: 3 }), reservationExpiresAt: future(),
    })

    await service.reconcile('attempt-1')

    expect(transitionProviderTransaction).toHaveBeenCalledWith(expect.anything(), expect.anything(), true, 'La transacción no coincide con el pedido')
  })
})
