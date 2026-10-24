import type { ServerSupabaseClient } from '../config/supabase.js'
import type { PaymentFailureDisposition } from '../payments/retry-policy.js'
import { schedulePaymentRetry } from '../payments/retry-policy.js'
import { RepositoryError } from '../utils/app-error.js'

export interface PaymentJob {
  attemptId: string | null
  attempts: number
  id: string
  leaseExpiresAt: string
  leaseOwner?: string
  operation: 'create_order' | 'reconcile_order' | 'cancel_order'
  reservationExpiresAt: string | null
  resourceId: string | null
  resourceType?: string | null
}

export interface PaymentJobUpdate {
  availableAt: Date | null
  disposition: PaymentFailureDisposition
  error: string
}

export interface IPaymentJobsRepository {
  claim(workerId?: string): Promise<PaymentJob | null>
  complete?(jobId: string, workerId: string, status: 'succeeded' | 'pending' | 'dead_letter' | 'manual_review', availableAt?: Date | null, error?: string): Promise<boolean>
  recordFailure(jobId: string, update: PaymentJobUpdate, workerId?: string): Promise<boolean>
  recordManualReview(jobId: string, reason: string, workerId?: string): Promise<boolean>
  retryForAdmin?(attemptId: string, reason: string): Promise<boolean>
}

interface QueryResult {
  data: unknown
  error: { code?: string; message?: string } | null
}

interface QueryBuilder extends PromiseLike<QueryResult> {
  eq(column: string, value: string): QueryBuilder
  gt(column: string, value: string): QueryBuilder
  in(column: string, values: readonly string[]): QueryBuilder
  maybeSingle(): Promise<QueryResult>
  select(columns: string): QueryBuilder
  update(values: Record<string, string | null | undefined>): QueryBuilder
}

interface PaymentJobsClient {
  from(table: string): QueryBuilder
  rpc(name: string, args: Record<string, unknown>): Promise<QueryResult>
}

export class PaymentJobsRepository implements IPaymentJobsRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async claim(workerId = 'legacy-worker'): Promise<PaymentJob | null> {
    const client = this.client as unknown as PaymentJobsClient
    const { data, error } = await client.rpc('claim_payment_job_v2', { p_lease: '5 minutes', p_worker_id: workerId })
    if (error !== null) throw new RepositoryError('No fue posible reclamar el trabajo de pago')
    const rows = Array.isArray(data) ? data as { job_id: string }[] : []
    const row = rows[0]
    if (row === undefined) return null
    const { data: rawClaimed, error: readError } = await client
      .from('payment_jobs')
      .select('id, attempt_id, inbox_id, attempts, operation, lease_expires_at, payment_attempts(reservation_expires_at), payment_inbox(resource_id, resource_type)')
      .eq('id', row.job_id)
      .eq('lease_owner', workerId)
      .maybeSingle()
    if (readError !== null || rawClaimed === null) throw new RepositoryError('No fue posible leer el trabajo reclamado')
    const claimed = rawClaimed as {
      attempt_id: string | null
      attempts: number
      id: string
      lease_expires_at: string
      operation: PaymentJob['operation']
      payment_attempts: { reservation_expires_at: string } | { reservation_expires_at: string }[] | null
      payment_inbox: { resource_id: string; resource_type: string } | { resource_id: string; resource_type: string }[] | null
    }
    const reservation = Array.isArray(claimed.payment_attempts) ? claimed.payment_attempts[0] : claimed.payment_attempts
    const inbox = Array.isArray(claimed.payment_inbox) ? claimed.payment_inbox[0] : claimed.payment_inbox
    return {
      attemptId: claimed.attempt_id,
      attempts: claimed.attempts,
      id: claimed.id,
      leaseExpiresAt: claimed.lease_expires_at,
      leaseOwner: workerId,
      operation: claimed.operation,
      reservationExpiresAt: reservation?.reservation_expires_at ?? null,
      resourceId: inbox?.resource_id ?? null,
      resourceType: inbox?.resource_type ?? null,
    }
  }

  public async complete(jobId: string, workerId: string, status: 'succeeded' | 'pending' | 'dead_letter' | 'manual_review', availableAt: Date | null = null, error?: string): Promise<boolean> {
    const client = this.client as unknown as PaymentJobsClient
    const { data, error: completionError } = await client.rpc('complete_payment_job_v2', {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_status: status,
      p_run_at: availableAt?.toISOString() ?? null,
      p_error: error ?? null,
    })
    if (completionError !== null) throw new RepositoryError('No fue posible finalizar el trabajo de pago')
    const rows = Array.isArray(data) ? data as { complete_payment_job_v2?: boolean }[] : []
    return data === true || rows[0]?.complete_payment_job_v2 === true
  }

  public async recordFailure(jobId: string, update: PaymentJobUpdate, workerId = 'legacy-worker'): Promise<boolean> {
    const values = update.disposition === 'retry'
      ? { status: 'pending', run_at: update.availableAt?.toISOString(), last_error: update.error }
      : { status: update.disposition, last_error: update.error }
    const client = this.client as unknown as PaymentJobsClient
    const { data, error } = await client
      .from('payment_jobs')
      .update(values)
      .eq('id', jobId)
      .eq('status', 'leased')
      .eq('lease_owner', workerId)
      .gt('lease_expires_at', new Date().toISOString())
      .select('id')
    if (error !== null) throw new RepositoryError('No fue posible actualizar el trabajo de pago')
    return Array.isArray(data) && data.length === 1
  }

  public async recordManualReview(jobId: string, reason: string, workerId = 'legacy-worker'): Promise<boolean> {
    return this.recordFailure(jobId, { availableAt: null, disposition: 'manual_review', error: reason }, workerId)
  }

  public async retryForAdmin(attemptId: string, reason: string): Promise<boolean> {
    const client = this.client as unknown as PaymentJobsClient
    const current = await client
      .from('payment_jobs')
      .select('id, attempts, payment_attempts(reservation_expires_at)')
      .eq('attempt_id', attemptId)
      .in('status', ['dead_letter', 'manual_review'])
      .maybeSingle()
    if (current.error !== null || current.data === null) return false
    const row = current.data as { id: string; attempts: number; payment_attempts: { reservation_expires_at: string } | { reservation_expires_at: string }[] | null }
    const reservation = Array.isArray(row.payment_attempts) ? row.payment_attempts[0] : row.payment_attempts
    if (reservation === null || reservation === undefined) return false
    const decision = schedulePaymentRetry(
      row.attempts,
      new Date(),
      new Date(reservation.reservation_expires_at),
      0,
    )
    if (decision.disposition !== 'retry' || decision.availableAt === null) return false
    const { data, error } = await client
      .from('payment_jobs')
      .update({ status: 'pending', run_at: decision.availableAt.toISOString(), lease_expires_at: null, lease_owner: null, last_error: reason.slice(0, 500) })
      .eq('id', row.id)
      .in('status', ['dead_letter', 'manual_review'])
      .select('id')
    if (error !== null) throw new RepositoryError('No fue posible reprogramar el pago')
    return Array.isArray(data) && data.length === 1
  }
}
