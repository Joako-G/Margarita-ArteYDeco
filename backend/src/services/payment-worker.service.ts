import type { Logger } from 'pino'

import type { PaymentJob } from '../repositories/payment-jobs.repository.js'
import { sanitizeReviewReason } from '../payments/retry-policy.js'
import type { PaymentRetryService } from './payment-retry.service.js'
import type { IPaymentReconciliationService } from './payment-reconciliation.service.js'
import type { IPaymentReservationsRepository } from '../repositories/payment-reservations.repository.js'
import type { IPaymentOutboxRepository, PaymentOutboxOperation } from '../repositories/payment-outbox.repository.js'
import type { PaymentProvider } from '../payments/types.js'
import type { IPaymentCheckoutRepository } from '../repositories/payment-checkout.repository.js'
import type { MercadoPagoConfig } from '../payments/config.js'
import { createPaymentIdempotencyKey } from '../payments/idempotency.js'
import { schedulePaymentReconciliation, schedulePaymentRetry } from '../payments/retry-policy.js'
import { AppError } from '../utils/app-error.js'

export interface PaymentOperationalAlert {
  jobId: string
  operation: PaymentJob['operation']
  disposition: 'dead_letter' | 'manual_review'
  reason: string
}

export interface PaymentAlertSink {
  notify(alert: PaymentOperationalAlert): Promise<void> | void
}

export interface PaymentWorkerResult {
  expiredReservations: number
  expiredReservationsApproved: number
  expiredReservationsExamined: number
  claimed: number
  completed: number
  failed: number
}

export class PaymentWorkerService {
  public constructor(
    private readonly retry: PaymentRetryService,
    private readonly reconciliation: IPaymentReconciliationService,
    private readonly reservations: IPaymentReservationsRepository,
    private readonly logger: Logger,
    private readonly alerts: PaymentAlertSink,
    private readonly outbox?: IPaymentOutboxRepository,
    private readonly provider?: PaymentProvider | null,
    private readonly checkoutRepository?: IPaymentCheckoutRepository,
    private readonly config?: MercadoPagoConfig,
  ) {}

  public async run(workerId: string, maxJobs = 10): Promise<PaymentWorkerResult> {
    const result: PaymentWorkerResult = {
      claimed: 0,
      completed: 0,
      failed: 0,
      expiredReservations: 0,
      expiredReservationsApproved: 0,
      expiredReservationsExamined: 0,
    }
    const expiryLimit = Math.min(Math.max(maxJobs, 1), 100)
    if (this.reconciliation.reconcileExpiredReservations !== undefined) {
      await this.reconciliation.reconcileExpiredReservations(expiryLimit)
    }
    const expiry = await this.reservations.releaseExpired(expiryLimit)
    result.expiredReservations = expiry.released
    result.expiredReservationsApproved = expiry.approved
    result.expiredReservationsExamined = expiry.examined
    if (this.outbox !== undefined && this.provider !== null && this.provider !== undefined && this.checkoutRepository !== undefined && this.config !== undefined) {
      for (let index = 0; index < maxJobs; index += 1) {
        const operation = await this.outbox.claim(workerId)
        if (operation === null) break
        try {
          const snapshot = await this.checkoutRepository.findSnapshot(operation.attemptId)
          const providerKey = createPaymentIdempotencyKey(snapshot.orderId, snapshot.attemptId, 'create_preference')
          const created = await this.provider.createPreference({
            amount: snapshot.amount,
            backUrls: {
              failure: this.config.failureUrl!.replaceAll('{orderNumber}', encodeURIComponent(snapshot.orderNumber)),
              pending: this.config.pendingUrl!.replaceAll('{orderNumber}', encodeURIComponent(snapshot.orderNumber)),
              success: this.config.successUrl!.replaceAll('{orderNumber}', encodeURIComponent(snapshot.orderNumber)),
            },
            currency: 'ARS',
            externalReference: snapshot.orderNumber,
            idempotencyKey: providerKey,
            items: snapshot.items,
          })
          await this.checkoutRepository.recordProviderPreference(snapshot.attemptId, providerKey, created)
          if (!await this.outbox.complete(operation.id, workerId)) await this.notifyOutbox(operation, 'manual_review', 'Payment outbox ownership was lost before completion')
        } catch (error) {
          const reason = sanitizeReviewReason(error instanceof Error ? error.message : 'Payment outbox failure')
          const decision = schedulePaymentRetry(operation.attempts, new Date(), new Date(operation.reservationExpiresAt ?? Date.now() + 86_400_000))
          const disposition = this.isPermanentProviderError(error) ? 'dead_letter' : decision.disposition
          if (disposition !== 'retry') {
            try {
              await this.checkoutRepository.recordProviderFailure(operation.attemptId, reason, 'manual_review')
            } catch {
              this.logger.error({ operation: 'quarantine_provider_preference' }, 'Could not quarantine provider preference failure')
            }
          }
          const saved = await this.outbox.recordFailure(operation.id, { availableAt: disposition === 'retry' ? decision.availableAt : null, disposition, error: reason }, workerId)
          if (!saved) await this.notifyOutbox(operation, 'manual_review', reason)
          else if (disposition !== 'retry') await this.notifyOutbox(operation, disposition, reason)
          result.failed += 1
        }
      }
    }
    for (let index = 0; index < maxJobs; index += 1) {
      const job = await this.retry.claim(workerId)
      if (job === null) break
      result.claimed += 1

      try {
        if (job.operation !== 'reconcile_order' || (job.attemptId === null && job.resourceId === null)) {
          const saved = await this.retry.complete(job.id, workerId, 'manual_review', null, 'Unsupported payment job operation')
          if (!saved) await this.notify(job, 'manual_review', 'Payment job ownership was lost before quarantine')
          else await this.notify(job, 'manual_review', 'Unsupported payment job operation')
          result.failed += 1
          continue
        }

        const reconciliation = job.attemptId !== null
          ? await this.reconciliation.reconcile(job.attemptId)
          : job.resourceType === 'merchant_order' && this.reconciliation.reconcileMerchantOrder !== undefined
            ? await this.reconciliation.reconcileMerchantOrder(job.resourceId!)
            : await this.reconciliation.reconcilePayment(job.resourceId!)
        const pending = reconciliation.status === 'pending' || reconciliation.status === 'in_process'
        const next = pending && job.reservationExpiresAt !== null
          ? schedulePaymentReconciliation(job.attempts, new Date(), new Date(job.reservationExpiresAt))
          : null
        const saved = await this.retry.complete(
          job.id,
          workerId,
          next?.disposition === 'retry' ? 'pending' : 'succeeded',
          next?.availableAt ?? null,
          next?.disposition === 'manual_review' ? 'Final payment reconciliation requires manual review' : undefined,
        )
        if (!saved) {
          await this.notify(job, 'manual_review', 'Payment job ownership was lost before completion')
          result.failed += 1
        } else {
          result.completed += 1
        }
      } catch (error) {
        const reason = sanitizeReviewReason(error instanceof Error ? error.message : 'Payment worker failure')
        if (job.operation === 'reconcile_order') {
          // Inbox-only webhook jobs do not have an attempt yet. Keep their
          // provider GET retryable until reconciliation resolves the attempt.
          const reservationExpiresAt = new Date(job.reservationExpiresAt ?? Date.now() + 86_400_000)
          const decision = schedulePaymentReconciliation(job.attempts, new Date(), reservationExpiresAt)
          const saved = await this.retry.complete(
            job.id,
            workerId,
            decision.disposition === 'retry' ? 'pending' : 'manual_review',
            decision.availableAt,
            decision.disposition === 'retry' ? reason : 'Final payment reconciliation requires manual review',
          )
          if (!saved) await this.notify(job, 'manual_review', 'Payment job ownership was lost before rescheduling')
          else if (decision.disposition !== 'retry') await this.notify(job, 'manual_review', reason)
          result.failed += 1
          continue
        }
        const decision = await this.retry.fail(job, reason)
        if (decision.disposition !== 'retry') await this.notify(job, decision.disposition, reason)
        result.failed += 1
      }
    }
    return result
  }

  private async notify(job: PaymentJob, disposition: 'dead_letter' | 'manual_review', reason: string): Promise<void> {
    const safeReason = sanitizeReviewReason(reason)
    this.logger.warn({ jobId: job.id, operation: job.operation, disposition }, 'Payment job requires operational review')
    await this.alerts.notify({ jobId: job.id, operation: job.operation, disposition, reason: safeReason })
  }

  private isPermanentProviderError(error: unknown): boolean {
    if (error instanceof AppError) return error.statusCode >= 400 && error.statusCode < 500 && ![408, 409, 429].includes(error.statusCode)
    return error instanceof Error && /INVALID|VALIDATION|BAD_REQUEST|UNAUTHORIZED|FORBIDDEN|NOT_FOUND/i.test(error.message)
  }

  private async notifyOutbox(operation: PaymentOutboxOperation, disposition: 'dead_letter' | 'manual_review', reason: string): Promise<void> {
    this.logger.warn({ jobId: operation.id, operation: operation.operation, disposition }, 'Payment outbox requires operational review')
    await this.alerts.notify({ jobId: operation.id, operation: operation.operation, disposition, reason: sanitizeReviewReason(reason) })
  }
}
