import type { IPaymentJobsRepository, PaymentJob } from '../repositories/payment-jobs.repository.js'
import { schedulePaymentRetry, sanitizeReviewReason } from '../payments/retry-policy.js'

export interface PaymentRetryResult {
  attempt: number
  disposition: 'retry' | 'dead_letter' | 'manual_review'
  availableAt: Date | null
}

export type ManualReviewAction = 'acknowledge' | 'retry'

export class PaymentRetryService {
  public constructor(private readonly repository: IPaymentJobsRepository) {}

  public claim(workerId?: string): Promise<PaymentJob | null> {
    return this.repository.claim(workerId)
  }

  public complete(jobId: string, workerId: string, status: 'succeeded' | 'pending' | 'dead_letter' | 'manual_review', availableAt: Date | null = null, error?: string): Promise<boolean> {
    if (this.repository.complete === undefined) return Promise.resolve(false)
    return this.repository.complete(jobId, workerId, status, availableAt, error)
  }

  public async fail(job: PaymentJob, error: string, now = new Date(), random = Math.random()): Promise<PaymentRetryResult> {
    const decision = schedulePaymentRetry(job.attempts, now, new Date(job.reservationExpiresAt ?? now.getTime() + 86_400_000), random)
    const saved = await this.repository.recordFailure(job.id, {
      availableAt: decision.availableAt,
      disposition: decision.disposition,
      error: sanitizeReviewReason(error),
    }, job.leaseOwner ?? 'legacy-worker')
    if (!saved) return { ...decision, disposition: 'manual_review', availableAt: null }
    return decision
  }

  public async review(jobId: string, action: ManualReviewAction, reason: string): Promise<boolean> {
    const safeReason = sanitizeReviewReason(reason)
    if (safeReason.length === 0) return false
    if (action === 'acknowledge') return this.repository.recordManualReview(jobId, safeReason)
    return this.repository.recordFailure(jobId, {
      availableAt: new Date(),
      disposition: 'retry',
      error: safeReason,
    })
  }

  public async retryForAdmin(attemptId: string, reason: string): Promise<boolean> {
    if (this.repository.retryForAdmin === undefined) return false
    const safeReason = sanitizeReviewReason(reason)
    if (safeReason.length === 0) return false
    return this.repository.retryForAdmin(attemptId, safeReason)
  }
}
