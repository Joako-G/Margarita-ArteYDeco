import type { Logger } from 'pino'

import type { MercadoPagoConfig } from '../payments/config.js'
import { isAllowedPaymentType } from '../payments/methods.js'
import type { PaymentProvider, ProviderPayment, ReconciledPaymentState } from '../payments/types.js'
import type {
  IPaymentReconciliationRepository,
  PaymentAttemptForReconciliation,
  PaymentTransition,
} from '../repositories/payment-reconciliation.repository.js'
import { AppError } from '../utils/app-error.js'

export interface PaymentReconciliationResult {
  attemptId: string
  providerStatus: string
  status: ReconciledPaymentState
  transition: 'applied' | 'stale' | 'manual_review'
}

export interface IPaymentReconciliationService {
  reconcile(attemptId: string): Promise<PaymentReconciliationResult>
  reconcileExpiredReservations?(limit: number): Promise<void>
  reconcilePayment(paymentId: string): Promise<PaymentReconciliationResult>
  reconcileMerchantOrder?(merchantOrderId: string): Promise<PaymentReconciliationResult>
}

const stateRank: Record<ReconciledPaymentState, number> = {
  pending: 1,
  in_process: 1,
  rejected: 2,
  expired: 2,
  approved: 3,
  manual_review: 4,
}

function normalizeProviderState(status: string): ReconciledPaymentState {
  switch (status.toLowerCase()) {
    case 'pending': return 'pending'
    case 'in_process': return 'in_process'
    case 'approved': return 'approved'
    case 'rejected': return 'rejected'
    case 'expired':
    case 'cancelled': return 'expired'
    default: return 'manual_review'
  }
}

function isNewer(attempt: PaymentAttemptForReconciliation, provider: ProviderPayment): boolean {
  if (provider.version !== null && attempt.providerVersion !== null) return provider.version > attempt.providerVersion
  return true
}

// A payment still pending or in process once the reservation expired cannot be trusted
// to resolve on its own: it is flagged so the attempt stays in manual review for the owner.
function isUnresolvedAfterExpiry(attempt: PaymentAttemptForReconciliation, providerStatus: string): boolean {
  if (attempt.reservationExpiresAt === null || attempt.reservationExpiresAt === undefined) return false
  const expiry = new Date(attempt.reservationExpiresAt).getTime()
  if (!Number.isFinite(expiry) || expiry > Date.now()) return false
  const state = normalizeProviderState(providerStatus)
  return state === 'pending' || state === 'in_process'
}

export class PaymentReconciliationService implements IPaymentReconciliationService {
  public constructor(
    private readonly repository: IPaymentReconciliationRepository,
    private readonly provider: PaymentProvider | null,
    private readonly config: MercadoPagoConfig,
    private readonly logger: Logger,
  ) {}

  public async reconcile(attemptId: string): Promise<PaymentReconciliationResult> {
    if (!this.config.enabled || this.config.validationError !== null || this.provider === null) {
      throw new AppError(503, 'Mercado Pago no está disponible', 'PAYMENT_METHOD_DISABLED')
    }

    const attempt = await this.repository.findAttempt(attemptId)
    if (this.provider.getPaymentsByExternalReference !== undefined || attempt.providerPaymentId === null) {
      if (this.provider.getPaymentsByExternalReference === undefined) {
        throw new AppError(503, 'No fue posible verificar el pago', 'PAYMENT_PROVIDER_UNAVAILABLE')
      }
      try {
        const payments = [...await this.provider.getPaymentsByExternalReference(attempt.externalReference)]
        if (payments.length === 0 && attempt.providerPaymentId !== null) {
          payments.push(await this.provider.getPayment(attempt.providerPaymentId))
        }
        if (payments.length === 0) {
          await this.repository.recordProviderLookupState?.(attempt.id, 'not_found')
          return { attemptId: attempt.id, providerStatus: 'not_found', status: attempt.status, transition: 'stale' }
        }
        let result: PaymentReconciliationResult | undefined
        for (const payment of payments) {
          // Every authenticated transaction contributes to the database aggregate;
          // identity mismatches remain review evidence, never a successful payment.
          result = await this.reconcileProviderPayment(await this.repository.findAttempt(attemptId), payment)
        }
        return result!
      } catch {
        await this.repository.recordProviderLookupState?.(attempt.id, 'unavailable')
        this.logger.warn({ attemptId, operation: 'search_payment_by_external_reference' }, 'Mercado Pago reconciliation search failed')
        throw new AppError(503, 'No fue posible verificar el pago', 'PAYMENT_PROVIDER_UNAVAILABLE')
      }
    }

    let providerPayment: ProviderPayment
    try {
      providerPayment = await this.provider.getPayment(attempt.providerPaymentId)
    } catch {
      this.logger.warn({ attemptId, operation: 'get_payment' }, 'Mercado Pago reconciliation failed')
      throw new AppError(503, 'No fue posible verificar el pago', 'PAYMENT_PROVIDER_UNAVAILABLE')
    }

    return this.reconcileProviderPayment(attempt, providerPayment)
  }

  public async reconcileExpiredReservations(limit: number): Promise<void> {
    const attempts = await this.repository.findExpiredAttempts(limit, new Date())
    for (const attempt of attempts) {
      try {
        await this.reconcile(attempt.id)
      } catch (error) {
        // Provider failure is unresolved, not evidence of rejection. The expiry
        // RPC releases inventory once and leaves owner review available.
        this.logger.warn({ attemptId: attempt.id, error: error instanceof Error ? error.message : 'unknown' }, 'Expired payment reservation requires unresolved-state handling')
      }
    }
  }

  public async reconcilePayment(paymentId: string): Promise<PaymentReconciliationResult> {
    if (!this.config.enabled || this.config.validationError !== null || this.provider === null) {
      throw new AppError(503, 'Mercado Pago no está disponible', 'PAYMENT_METHOD_DISABLED')
    }

    let providerPayment: ProviderPayment
    try {
      providerPayment = await this.provider.getPayment(paymentId)
    } catch {
      this.logger.warn({ paymentId }, 'Mercado Pago payment reconciliation failed')
      throw new AppError(503, 'No fue posible verificar el pago', 'PAYMENT_PROVIDER_UNAVAILABLE')
    }

    const attempt = await this.repository.findAttemptByExternalReference(this.config.environment, providerPayment.externalReference)
    if (attempt === null) {
      throw new AppError(409, 'El pago requiere revisión manual', 'PAYMENT_MANUAL_REVIEW')
    }
    return this.reconcileProviderPayment(attempt, providerPayment)
  }

  public async reconcileMerchantOrder(merchantOrderId: string): Promise<PaymentReconciliationResult> {
    if (!this.config.enabled || this.config.validationError !== null || this.provider === null) {
      throw new AppError(503, 'Mercado Pago no está disponible', 'PAYMENT_METHOD_DISABLED')
    }

    try {
      let getPaymentIds: ((id: string) => Promise<readonly string[]>) | undefined
      if (this.provider.getMerchantOrderPaymentIds !== undefined) {
        getPaymentIds = (id: string): Promise<readonly string[]> => this.provider!.getMerchantOrderPaymentIds!(id)
      } else if (this.provider.getMerchantOrderPaymentId !== undefined) {
        getPaymentIds = async (id: string): Promise<readonly string[]> => [await this.provider!.getMerchantOrderPaymentId!(id)]
      }
      if (getPaymentIds === undefined) {
        throw new AppError(503, 'Mercado Pago no está disponible', 'PAYMENT_METHOD_DISABLED')
      }
      const paymentIds = await getPaymentIds(merchantOrderId)
      if (paymentIds.length === 0) throw new AppError(409, 'El pago requiere revisión manual', 'PAYMENT_MANUAL_REVIEW')
      const results: PaymentReconciliationResult[] = []
      for (const paymentId of paymentIds) results.push(await this.reconcilePayment(paymentId))
      return results.reduce((selected, current) => stateRank[current.status] > stateRank[selected.status] ? current : selected)
    } catch (error) {
      if (error instanceof AppError) throw error
      this.logger.warn({ merchantOrderId }, 'Mercado Pago merchant order reconciliation failed')
      throw new AppError(503, 'No fue posible verificar el pago', 'PAYMENT_PROVIDER_UNAVAILABLE')
    }
  }

  private async reconcileProviderPayment(
    attempt: PaymentAttemptForReconciliation,
    providerPayment: ProviderPayment,
  ): Promise<PaymentReconciliationResult> {
    if (
      typeof this.repository.findProviderTransaction !== 'function'
      || typeof this.repository.upsertProviderTransaction !== 'function'
      || typeof this.repository.transitionProviderTransaction !== 'function'
    ) {
      if (attempt.providerPaymentId !== null && attempt.providerPaymentId !== providerPayment.id) {
        return this.applyManualReview(attempt, providerPayment)
      }
      await this.repository.recordProviderPaymentId(attempt.id, providerPayment.id)
      return this.applyPayment({ ...attempt, providerPaymentId: providerPayment.id }, providerPayment)
    }

    const identityMatches = providerPayment.externalReference === attempt.externalReference
      && providerPayment.currency === attempt.currency
      && providerPayment.amount === attempt.amount
      && providerPayment.paymentTypeId !== null
      && isAllowedPaymentType(providerPayment.paymentTypeId)
    const identityError = identityMatches ? null : 'La transacción no coincide con el pedido'
    const needsReview = !identityMatches || isUnresolvedAfterExpiry(attempt, providerPayment.status)
    let transaction = await this.repository.findProviderTransaction(this.config.environment, providerPayment.id)

    if (transaction !== null && transaction.paymentAttemptId !== attempt.id) {
      throw new AppError(409, 'El pago requiere revisión manual', 'PAYMENT_MANUAL_REVIEW')
    }

    if (transaction === null) {
      transaction = await this.repository.upsertProviderTransaction(
        attempt.id,
        this.config.environment,
        providerPayment,
        needsReview,
        identityError,
      )
    } else if (
      providerPayment.version !== null
      && transaction.providerVersion !== null
      && providerPayment.version <= transaction.providerVersion
      && identityMatches
      && !(attempt.status === 'manual_review' && transaction.status === 'approved')
      && !(needsReview && !transaction.reviewRequired)
    ) {
      return {
        attemptId: attempt.id,
        providerStatus: providerPayment.status,
        status: transaction.status,
        transition: 'stale',
      }
    }

    const next = identityMatches ? normalizeProviderState(providerPayment.status) : 'manual_review'
    const result = await this.repository.transitionProviderTransaction(
      transaction,
      {
        providerStatus: providerPayment.status,
        providerUpdatedAt: providerPayment.updatedAt,
        providerVersion: providerPayment.version,
        status: next,
      },
      needsReview,
      identityError,
    )

    return {
      attemptId: attempt.id,
      providerStatus: providerPayment.status,
      status: result.status,
      transition: !identityMatches && result.transition === 'applied' ? 'manual_review' : result.transition,
    }
  }

  private async applyPayment(attempt: PaymentAttemptForReconciliation, providerPayment: ProviderPayment): Promise<PaymentReconciliationResult> {
    const identityMatches = providerPayment.id === attempt.providerPaymentId
      && providerPayment.externalReference === attempt.externalReference
      && providerPayment.currency === attempt.currency
      && providerPayment.amount === attempt.amount
      && providerPayment.paymentTypeId !== null
      && isAllowedPaymentType(providerPayment.paymentTypeId)

    if (!identityMatches) return this.applyManualReview(attempt, providerPayment)

    const next = normalizeProviderState(providerPayment.status)
    if (!isNewer(attempt, providerPayment) || stateRank[next] < stateRank[attempt.status]) {
      return { attemptId: attempt.id, providerStatus: providerPayment.status, status: attempt.status, transition: 'stale' }
    }

    const transition: PaymentTransition = {
      providerStatus: providerPayment.status,
      providerUpdatedAt: providerPayment.updatedAt,
      providerVersion: providerPayment.version,
      status: next,
    }
    const result = await this.repository.transition(attempt, transition)
    return { attemptId: attempt.id, providerStatus: providerPayment.status, status: next, transition: result }
  }

  private async applyManualReview(
    attempt: PaymentAttemptForReconciliation,
    providerPayment: ProviderPayment,
  ): Promise<PaymentReconciliationResult> {
    const result = await this.repository.transition(attempt, {
      providerStatus: providerPayment.status,
      providerUpdatedAt: providerPayment.updatedAt,
      providerVersion: providerPayment.version,
      status: 'manual_review',
    })
    return { attemptId: attempt.id, providerStatus: providerPayment.status, status: 'manual_review', transition: result === 'stale' ? 'stale' : 'manual_review' }
  }
}
