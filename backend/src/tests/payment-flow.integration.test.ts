import { createHmac } from 'node:crypto'

import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import { loadMercadoPagoConfig } from '../payments/config.js'
import type { ProviderPayment, ReconciledPaymentState } from '../payments/types.js'
import { PaymentInboxRepository } from '../repositories/payment-inbox.repository.js'
import type { PaymentJob } from '../repositories/payment-jobs.repository.js'
import { PaymentReconciliationService } from '../services/payment-reconciliation.service.js'
import { PaymentRetryService } from '../services/payment-retry.service.js'
import { PaymentCheckoutService } from '../services/payment-checkout.service.js'
import { PaymentWebhookService } from '../services/payment-webhook.service.js'
import { PaymentWorkerService } from '../services/payment-worker.service.js'
import { AdminOrderService } from '../services/admin-orders.service.js'
import type { IAdminOrderRecord } from '../types/admin-orders.js'

const webhookSecret = 'test-webhook-secret-that-is-at-least-32-characters'
const orderNumber = 'MAD-20260923-000001'
const config = {
  ...loadMercadoPagoConfig({
    NODE_ENV: 'development',
    MP_ACCESS_TOKEN: 'test-token',
    MP_ENABLED: '1',
    MP_ENVIRONMENT: 'sandbox',
    MP_EXCLUDED_PAYMENT_TYPE_IDS: 'ticket,credit_card',
    MP_FAILURE_URL: 'https://shop.example.test/failure',
    MP_NOTIFICATION_URL: 'https://api.example.test/api/webhooks/mercado-pago',
    MP_PENDING_URL: 'https://shop.example.test/pending',
    MP_SUCCESS_URL: 'https://shop.example.test/success',
    MP_WEBHOOK_SECRET: webhookSecret,
  }),
  enabled: true,
  validationError: null,
}
const logger = pino({ enabled: false })

interface FlowState {
  attemptId: string
  orderId: string
  paymentId: string | null
  providerStatus: string | null
  status: ReconciledPaymentState
  providerVersion: number | null
  released: boolean
}

function providerPayment(status: string): ProviderPayment {
  return {
    amount: 1500,
    currency: 'ARS',
    externalReference: orderNumber,
    id: 'payment-1',
    paymentTypeId: 'debit_card',
    status,
    updatedAt: '2026-09-23T20:00:00.000Z',
    version: 2,
  }
}

function toAdminPaymentStatus(status: ReconciledPaymentState): IAdminOrderRecord['paymentReconciliationStatus'] {
  return status === 'in_process' ? 'pending' : status
}

function signedWebhook(): { requestId: string; signature: string } {
  const requestId = 'request-payment-1'
  const timestamp = Math.floor(Date.now() / 1000)
  const manifest = `id:payment-1;request-id:${requestId};ts:${timestamp};`
  const digest = createHmac('sha256', webhookSecret).update(manifest).digest('hex')
  return { requestId, signature: `ts=${timestamp},v1=${digest}` }
}

function createFlow(status: string): {
  admin: AdminOrderService
  checkout: PaymentCheckoutService
  jobs: { claim: ReturnType<typeof vi.fn>; complete: ReturnType<typeof vi.fn> }
  reconciliation: PaymentReconciliationService
  state: FlowState
  worker: PaymentWorkerService
} {
  const state: FlowState = {
    attemptId: 'attempt-1',
    orderId: 'order-1',
    paymentId: null,
    providerStatus: null,
    providerVersion: 1,
    released: false,
    status: 'pending',
  }
  const attempt = (): {
    amount: number
    currency: string
    externalReference: string
    id: string
    orderId: string
    providerPreferenceId: string
    providerPaymentId: string | null
    providerVersion: number | null
    status: ReconciledPaymentState
  } => ({
    amount: 1500,
    currency: 'ARS',
    externalReference: orderNumber,
    id: state.attemptId,
    orderId: state.orderId,
    providerPreferenceId: 'preference-1',
    providerPaymentId: state.paymentId,
    providerVersion: state.providerVersion,
    status: state.status,
  })
  const reconciliationRepository = {
    findAttempt: vi.fn(async () => attempt()),
    findExpiredAttempts: vi.fn(async () => []),
    findAttemptByExternalReference: vi.fn(async () => attempt()),
    recordProviderPaymentId: vi.fn(async (_attemptId: string, paymentId: string) => { state.paymentId = paymentId }),
    transition: vi.fn(async (_current: unknown, transition: { providerStatus: string; providerVersion: number | null; status: ReconciledPaymentState }) => {
      state.providerStatus = transition.providerStatus
      state.providerVersion = transition.providerVersion
      state.status = transition.status
      return 'applied' as const
    }),
  }
  const provider = {
    createPreference: vi.fn(),
    getPayment: vi.fn(async () => providerPayment(status)),
  }
  const reconciliation = new PaymentReconciliationService(reconciliationRepository, provider, config, logger)
  const job: PaymentJob = {
    attemptId: null,
    attempts: 1,
    id: 'job-1',
    leaseExpiresAt: '2026-09-23T20:05:00.000Z',
    leaseOwner: 'test-worker',
    operation: 'reconcile_order',
    reservationExpiresAt: '2026-09-23T21:00:00.000Z',
    resourceId: 'payment-1',
  }
  const jobs = {
    claim: vi.fn().mockResolvedValueOnce(job).mockResolvedValue(null),
    complete: vi.fn().mockResolvedValue(true),
    recordFailure: vi.fn(),
    recordManualReview: vi.fn(),
  }
  const reservations = {
    releaseExpired: vi.fn(async () => {
      if (state.status === 'rejected' || state.status === 'expired') {
        if (state.released) return { approved: 0, examined: 0, released: 0 }
        state.released = true
        return { approved: 0, examined: 1, released: 1 }
      }
      return { approved: 0, examined: 0, released: 0 }
    }),
  }
  const worker = new PaymentWorkerService(
    new PaymentRetryService(jobs),
    reconciliation,
    reservations,
    logger,
    { notify: vi.fn() },
  )
  const checkout = new PaymentCheckoutService(
    { findLatestAttempt: vi.fn(async () => ({ reservationExpiresAt: new Date('2099-09-23T21:00:00.000Z'), status: state.status })) } as never,
    {} as never,
    null,
    config,
    logger,
    { authorizeOrder: vi.fn(async () => ({ orderId: state.orderId })) } as never,
  )
  const order: IAdminOrderRecord = {
    contractConcludedAt: null,
    createdAt: '2026-09-23T19:00:00.000Z',
    customerFirstName: 'Ana',
    customerLastName: 'Lopez',
    customerPhone: '1123456789',
    customerPhoneNormalized: '1123456789',
    deliveryMethod: 'pickup',
    discount: 0,
    deliveredAt: null,
    id: state.orderId,
    itemCount: 1,
    notes: null,
    orderNumber,
    paymentMethod: 'mercado_pago',
    paymentProviderId: state.paymentId,
    paymentProviderStatus: state.providerStatus,
    paymentReconciliationStatus: toAdminPaymentStatus(state.status),
    persistedPaymentStatus: state.status === 'approved' ? 'paid' : state.status === 'rejected' ? 'rejected' : 'pending',
    paymentStatus: state.status === 'approved' ? 'paid' : state.status === 'rejected' ? 'rejected' : 'pending',
    paymentUpdatedAt: '2026-09-23T20:00:00.000Z',
    paymentRequiresManualReview: state.status === 'manual_review',
    pickedUpAt: null,
    shippingAddress: null,
    status: 'pending',
    subtotal: 1500,
    total: 1500,
    updatedAt: '2026-09-23T20:00:00.000Z',
  }
  const admin = new AdminOrderService(
    {
      findById: vi.fn(async () => ({ ...order, paymentProviderId: state.paymentId, paymentProviderStatus: state.providerStatus, paymentReconciliationStatus: toAdminPaymentStatus(state.status), persistedPaymentStatus: state.status === 'approved' ? 'paid' : state.status === 'rejected' ? 'rejected' : 'pending', paymentStatus: state.status === 'approved' ? 'paid' : state.status === 'rejected' ? 'rejected' : 'pending' })),
      findItems: vi.fn(async () => []),
      findPage: vi.fn(async () => ({ items: [{ ...order, paymentProviderId: state.paymentId, paymentProviderStatus: state.providerStatus, paymentReconciliationStatus: toAdminPaymentStatus(state.status), paymentStatus: state.status === 'approved' ? 'paid' : state.status === 'rejected' ? 'rejected' : 'pending' }], totalItems: 1 })),
      transition: vi.fn(),
      cancel: vi.fn(),
    } as never,
    { findPublic: vi.fn(async () => ({ address: 'Address', businessHours: 'Hours', businessName: 'Business', facebook: null, id: 'settings', instagram: null, logoPath: null, mapsUrl: 'https://maps.example', transferDiscount: 0, whatsapp: '5491100000000' })) } as never,
    logger,
  )

  return { admin, checkout, jobs, reconciliation, state, worker }
}

describe('Mercado Pago payment flow integration boundaries', () => {
  it('uses payment data.id, deduplicates the webhook, updates state, and projects the authoritative result', async () => {
    const flow = createFlow('approved')
    const inbox = new Map<string, boolean>()
    const rpc = vi.fn(async (_name: string, input: { p_request_id: string }) => {
        const duplicate = inbox.has(input.p_request_id)
        inbox.set(input.p_request_id, true)
        return { data: duplicate, error: null }
      })
    const repository = new PaymentInboxRepository({ rpc } as never)
    const webhook = new PaymentWebhookService(repository, config, logger)
    const headers = signedWebhook()
    const body = Buffer.from(JSON.stringify({ action: 'payment.updated', data: { id: 'payment-1' }, type: 'payment' }))

    await expect(webhook.receive({ body, requestId: headers.requestId, signature: headers.signature })).resolves.toEqual({ duplicate: false })
    await expect(webhook.receive({ body, requestId: headers.requestId, signature: headers.signature })).resolves.toEqual({ duplicate: true })
    expect(rpc).toHaveBeenNthCalledWith(1, 'acknowledge_payment_webhook_v2', expect.objectContaining({ p_resource_id: 'payment-1' }))

    await expect(flow.worker.run('test-worker')).resolves.toMatchObject({ claimed: 1, completed: 1 })
    expect(flow.reconciliation).toBeDefined()
    expect(flow.state).toMatchObject({ paymentId: 'payment-1', providerStatus: 'approved', status: 'approved' })
    expect(flow.jobs.complete).toHaveBeenCalledTimes(1)

    await expect(flow.checkout.getStatus(orderNumber, 'session-token')).resolves.toMatchObject({ status: 'approved', nextAction: 'view_order' })
    await expect(flow.admin.list({ page: 1, pageSize: 10, paymentMethod: 'all', paymentStatus: 'all', sort: 'newest', status: 'all' })).resolves.toMatchObject({
      items: [{ paymentProviderId: 'payment-1', paymentReconciliationStatus: 'approved', paymentStatus: 'paid' }],
    })
  })

  it.each(['rejected', 'expired'] as const)('releases a %s reservation only once', async (status) => {
    const flow = createFlow(status)

    await flow.worker.run('test-worker')
    await expect(flow.worker.run('test-worker')).resolves.toMatchObject({ expiredReservations: 1 })
    await expect(flow.worker.run('test-worker')).resolves.toMatchObject({ expiredReservations: 0 })
    expect(flow.state.released).toBe(true)
  })
})
