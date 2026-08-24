import { describe, expect, it, vi } from 'vitest'

import type { IConsumerWithdrawalRepository } from '../repositories/consumer-withdrawals.repository.js'
import { AdminConsumerWithdrawalService } from '../services/admin-consumer-withdrawals.service.js'
import { ConsumerWithdrawalProtectionService } from '../services/consumer-withdrawal-protection.service.js'
import { ConsumerWithdrawalService } from '../services/consumer-withdrawals.service.js'
import type { ConsumerWithdrawalBlockedError } from '../services/consumer-withdrawals.service.js'
import type { ITurnstileService } from '../services/turnstile.service.js'
import type { IConsumerWithdrawalRecord } from '../types/consumer-withdrawals.js'

const REQUEST_ID = 'a7043af9-ce26-451f-aaba-2041dd6383ba'
const NOW = '2026-08-19T15:00:00.000Z'

function record(overrides: Partial<IConsumerWithdrawalRecord> = {}): IConsumerWithdrawalRecord {
  return {
    acknowledgementIssuedAt: NOW,
    applicableAt: null,
    closedAt: null,
    contactPhoneNormalized: '3511234567',
    createdAt: NOW,
    customerComment: null,
    firstReviewDueAt: NOW,
    firstReviewedAt: null,
    id: REQUEST_ID,
    legalDeadlineAt: null,
    legalTimeBasis: null,
    legalTimeStatus: 'unknown',
    notApplicableAt: null,
    orderId: null,
    orderNumber: null,
    orderReferenceInput: 'MAD-20260819-000001',
    orderReferenceUnavailable: false,
    publicCodeSuffix: 'ABC234',
    publicExplanation: null,
    refundStatus: 'not_required',
    requestStatus: 'received',
    resolutionReason: null,
    returnStatus: 'not_required',
    source: 'web',
    submittedAt: NOW,
    updatedAt: NOW,
    version: 1,
    ...overrides,
  }
}

function repository(current: IConsumerWithdrawalRecord = record()): IConsumerWithdrawalRepository {
  return {
    correctSettlement: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(current),
    findById: vi.fn().mockResolvedValue(current),
    findByPublicCodeHash: vi.fn().mockResolvedValue(current),
    findEvents: vi.fn().mockResolvedValue([]),
    findOrderCandidates: vi.fn().mockResolvedValue([]),
    findOrderRefundSnapshot: vi.fn().mockResolvedValue({
      deliveryMethod: 'pickup',
      method: 'bank_transfer',
      orderNumber: 'MAD-20260819-000001',
      paymentStatus: 'paid',
      status: 'cancelled',
      total: 10_000,
    }),
    findReturnItems: vi.fn().mockResolvedValue([]),
    findPage: vi.fn().mockResolvedValue({ items: [current], totalItems: 1 }),
    findSettlement: vi.fn().mockResolvedValue(null),
    linkOrder: vi.fn().mockResolvedValue(undefined),
    inspectReturn: vi.fn().mockResolvedValue(undefined),
    recordSettlement: vi.fn().mockResolvedValue(undefined),
    registerAttempt: vi.fn().mockResolvedValue({
      captchaRequired: false,
      isBlocked: false,
      retryAfterSeconds: 0,
    }),
    transition: vi.fn().mockResolvedValue(undefined),
  }
}

const turnstile: ITurnstileService = { verify: vi.fn().mockResolvedValue('valid') }

describe('consumer withdrawals services', () => {
  it('derives a stable high-entropy code without exposing it to persistence', async () => {
    const repo = repository()
    const protection = new ConsumerWithdrawalProtectionService('test-only-hmac-secret-at-least-32-characters')
    const service = new ConsumerWithdrawalService(repo, protection, turnstile)
    const input = {
      comment: 'Sin justificar',
      orderNumber: 'MAD-20260819-000001',
      orderNumberUnavailable: false,
      phone: '351 123-4567',
    }

    const first = await service.create(input, 'withdrawal-idempotency-key-0001', '203.0.113.10')
    const second = await service.create(input, 'withdrawal-idempotency-key-0001', '203.0.113.10')

    expect(first.requestCode).toBe(second.requestCode)
    expect(first.requestCode).toMatch(/^AR-(?:[A-Z2-9]{5}-){4}[A-Z2-9]{6}$/)
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      phoneNormalized: '3511234567',
      publicCodeHash: expect.not.stringContaining(first.requestCode),
      publicCodeSuffix: first.requestCode.slice(-6),
    }))
  })

  it('keeps a provider outage from losing a valid submission', async () => {
    const repo = repository()
    const unavailableTurnstile: ITurnstileService = { verify: vi.fn().mockResolvedValue('unavailable') }
    const service = new ConsumerWithdrawalService(
      repo,
      new ConsumerWithdrawalProtectionService('test-only-hmac-secret-at-least-32-characters'),
      unavailableTurnstile,
    )
    await expect(service.create({
      captchaToken: 'token',
      orderNumberUnavailable: true,
      phone: '3511234567',
    }, 'withdrawal-idempotency-key-0002', '203.0.113.10')).resolves.toMatchObject({ status: 'received' })
  })

  it('enforces the persistent submission limit', async () => {
    const repo = repository()
    vi.mocked(repo.registerAttempt).mockResolvedValue({
      captchaRequired: true,
      isBlocked: true,
      retryAfterSeconds: 120,
    })
    const service = new ConsumerWithdrawalService(
      repo,
      new ConsumerWithdrawalProtectionService('test-only-hmac-secret-at-least-32-characters'),
      turnstile,
    )
    await expect(service.create({
      orderNumberUnavailable: true,
      phone: '3511234567',
    }, 'withdrawal-idempotency-key-0003', '203.0.113.10')).rejects.toEqual(
      expect.objectContaining<Partial<ConsumerWithdrawalBlockedError>>({
        retryAfterSeconds: 120,
        statusCode: 429,
      }),
    )
  })

  it('returns an understandable non-applicability status without internal notes', async () => {
    const repo = repository(record({ requestStatus: 'not_applicable', resolutionReason: 'internal' }))
    const service = new ConsumerWithdrawalService(
      repo,
      new ConsumerWithdrawalProtectionService('test-only-hmac-secret-at-least-32-characters'),
      turnstile,
    )
    const result = await service.getStatus('AR-ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ23')
    expect(result.status).toBe('not_applicable')
    expect(result.nextStep).toContain('Atención al cliente')
    expect(JSON.stringify(result)).not.toContain('internal')
  })

  it('allows restitution and return coordination in parallel after applicability', async () => {
    const repo = repository(record({
      orderId: '20000000-0000-4000-8000-000000000001',
      orderNumber: 'MAD-20260819-000001',
      requestStatus: 'applicable',
      refundStatus: 'pending',
      returnStatus: 'pending',
    }))
    const service = new AdminConsumerWithdrawalService(
      repo,
      new ConsumerWithdrawalProtectionService('test-only-hmac-secret-at-least-32-characters'),
    )
    const detail = await service.getById(REQUEST_ID)
    expect(detail.availableActions).toEqual(expect.arrayContaining([
      'receiveReturn',
      'markRefundProcessing',
      'confirmManualRefund',
    ]))
    expect(detail.availableActions).not.toContain('close')
    expect(detail.order).toMatchObject({
      paymentStatus: 'paid',
      status: 'cancelled',
      total: 10_000,
    })
    expect(detail.refund).toMatchObject({
      contractAmount: 10_000,
      method: 'bank_transfer',
      totalAmount: 10_000,
    })
  })

  it('rejects a manual refund when the confirmed total does not match the breakdown', async () => {
    const repo = repository(record({
      orderId: '20000000-0000-4000-8000-000000000001',
      requestStatus: 'applicable',
      refundStatus: 'pending',
    }))
    const service = new AdminConsumerWithdrawalService(
      repo,
      new ConsumerWithdrawalProtectionService('test-only-hmac-secret-at-least-32-characters'),
    )

    await expect(service.executeAction(REQUEST_ID, {
      action: 'confirmManualRefund',
      confirmedTotalRefundAmount: 20_000,
      expectedVersion: 1,
      reason: 'Transferencia realizada',
      reference: 'Operación 123',
      returnShippingRefundAmount: 0,
    }, '40000000-0000-4000-8000-000000000001', 'admin-refund-key-0001'))
      .rejects.toMatchObject({ code: 'WITHDRAWAL_REFUND_TOTAL_MISMATCH', statusCode: 409 })
    expect(repo.recordSettlement).not.toHaveBeenCalled()
  })

  it('delegates the inspected quantities to the atomic stock operation', async () => {
    const repo = repository(record({
      orderId: '20000000-0000-4000-8000-000000000001',
      requestStatus: 'applicable',
      returnStatus: 'received',
    }))
    const service = new AdminConsumerWithdrawalService(
      repo,
      new ConsumerWithdrawalProtectionService('test-only-hmac-secret-at-least-32-characters'),
    )
    const returnItems = [{
      nonRestockableQuantity: 1,
      orderItemId: '22000000-0000-4000-8000-000000000001',
      restockableQuantity: 2,
    }]

    await service.executeAction(REQUEST_ID, {
      action: 'inspectReturn',
      expectedVersion: 1,
      reason: 'Dos unidades aptas y una dañada',
      returnItems,
    }, '40000000-0000-4000-8000-000000000001', 'admin-return-key-0001')

    expect(repo.inspectReturn).toHaveBeenCalledWith(expect.objectContaining({
      expectedVersion: 1,
      items: returnItems,
      reason: 'Dos unidades aptas y una dañada',
      requestId: REQUEST_ID,
    }))
    expect(repo.transition).not.toHaveBeenCalled()
  })

  it('rectifies a completed refund through an auditable compensating action', async () => {
    const repo = repository(record({
      orderId: '20000000-0000-4000-8000-000000000001',
      requestStatus: 'closed',
      refundStatus: 'succeeded',
      version: 6,
    }))
    const service = new AdminConsumerWithdrawalService(
      repo,
      new ConsumerWithdrawalProtectionService('test-only-hmac-secret-at-least-32-characters'),
    )

    await service.executeAction(REQUEST_ID, {
      action: 'correctManualRefund',
      confirmedTotalRefundAmount: 10_000,
      expectedVersion: 6,
      reason: 'Se duplicó el total como gasto de devolución',
      returnShippingRefundAmount: 0,
    }, '40000000-0000-4000-8000-000000000001', 'admin-refund-key-0002')

    expect(repo.correctSettlement).toHaveBeenCalledWith(expect.objectContaining({
      confirmedTotalRefundAmount: 10_000,
      expectedVersion: 6,
      reason: 'Se duplicó el total como gasto de devolución',
      returnShippingRefundAmount: 0,
    }))
  })
})
