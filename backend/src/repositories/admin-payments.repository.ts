/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents */

import type { ServerSupabaseClient } from '../config/supabase.js'
import type {
  AdminPaymentReconciliationStatusType,
  IAdminPaymentAuditEvent,
  IAdminPaymentAttemptDto,
  IAdminPaymentReconciliationFilters,
  IAdminPaymentTransactionDto,
} from '../types/admin-payments.js'
import { RepositoryError } from '../utils/app-error.js'

interface AdminPaymentAttemptRecord extends Omit<IAdminPaymentAttemptDto, 'auditTimeline' | 'canRetry' | 'canReview' | 'canSync' | 'attemptNumber' | 'status'> {
  attemptNumber: number
  jobId: string | null
  jobStatus: string | null
  providerPaymentId: string | null
  status: AdminPaymentReconciliationStatusType
}

export interface IAdminPaymentRepository {
  findPage(filters: IAdminPaymentReconciliationFilters): Promise<{ items: readonly AdminPaymentAttemptRecord[]; totalItems: number }>
  findAuditEvents(attemptIds: readonly string[]): Promise<ReadonlyMap<string, readonly IAdminPaymentAuditEvent[]>>
  findAttempt(attemptId: string): Promise<AdminPaymentAttemptRecord | null>
  retryJob(attemptId: string, reason: string): Promise<boolean>
  recordSync(attemptId: string, actorProfileId: string): Promise<boolean>
  recordReview(attemptId: string, note: string, decision: 'acknowledge' | 'retry', actorProfileId: string): Promise<boolean>
  reviewAttempt(attemptId: string, decision: 'acknowledge' | 'retry', note: string, actorProfileId: string): Promise<boolean>
}

type QueryClient = {
  from(table: string): any
}

function mapStatus(status: string, jobStatus: string | null): AdminPaymentReconciliationStatusType {
  if (jobStatus === 'dead_letter') return 'dead_letter'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'expired') return 'expired'
  return status as AdminPaymentReconciliationStatusType
}

function mapAttempt(row: any, attemptNumber: number, job: any | null, includeDeadLetter = true): AdminPaymentAttemptRecord {
  return {
    amount: Number(row.amount),
    createdAt: row.created_at,
    currency: row.currency,
    id: row.id,
    jobId: job?.id ?? null,
    jobStatus: job?.status ?? null,
    lastError: row.last_error,
    orderId: row.order_id,
    orderNumber: row.orders?.order_number ?? '',
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
    providerStatus: row.provider_status,
    providerUpdatedAt: row.provider_updated_at,
    reservationExpiresAt: row.reservation_expires_at,
    status: mapStatus(row.status, includeDeadLetter ? job?.status ?? null : null),
    transactions: row.transactions ?? [],
    updatedAt: row.updated_at,
    attemptNumber,
  }
}

export class AdminPaymentRepository implements IAdminPaymentRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findPage(filters: IAdminPaymentReconciliationFilters): Promise<{ items: readonly AdminPaymentAttemptRecord[]; totalItems: number }> {
    const client = this.client as unknown as QueryClient
    let query = client.from('payment_attempts').select(
      'id, order_id, amount, currency, provider_order_id, provider_payment_id, provider_status, provider_updated_at, reservation_expires_at, last_error, status, created_at, updated_at, orders(order_number)',
      { count: 'exact' },
    )
    if (filters.status !== 'all' && filters.status !== 'dead_letter') {
      query = query.eq('status', filters.status === 'cancelled' ? 'cancelled' : filters.status)
    }
    if (filters.status === 'dead_letter') {
      const deadLetters = await client.from('payment_jobs').select('attempt_id').eq('status', 'dead_letter')
      if (deadLetters.error !== null) throw new RepositoryError('No fue posible consultar los trabajos de pago')
      const attemptIds = (deadLetters.data ?? []).map((row: { attempt_id: string }) => row.attempt_id)
      if (attemptIds.length === 0) return { items: [], totalItems: 0 }
      query = query.in('id', attemptIds)
    }
    const firstRow = (filters.page - 1) * filters.pageSize
    const result = await query.order('created_at', { ascending: false }).range(firstRow, firstRow + filters.pageSize - 1)
    if (result.error !== null || !Array.isArray(result.data) || result.count === null) {
      throw new RepositoryError('No fue posible consultar la conciliación de pagos')
    }

    const rows = result.data as any[]
    const transactionsResult = await client.from('payment_transactions')
      .select('id, payment_attempt_id, provider_payment_id, amount, currency, payment_type_id, status, provider_status, provider_updated_at, review_required, last_error, updated_at')
      .in('payment_attempt_id', rows.map((row) => row.id))
      .order('updated_at', { ascending: false })
    if (transactionsResult.error !== null) throw new RepositoryError('No fue posible consultar las transacciones de pago')
    const transactions = new Map<string, IAdminPaymentTransactionDto[]>()
    for (const row of transactionsResult.data ?? []) {
      const current = transactions.get(row.payment_attempt_id) ?? []
      current.push({
        amount: Number(row.amount),
        currency: row.currency,
        id: row.id,
        lastError: row.last_error,
        paymentTypeId: row.payment_type_id,
        providerPaymentId: row.provider_payment_id,
        providerStatus: row.provider_status,
        providerUpdatedAt: row.provider_updated_at,
        reviewRequired: row.review_required,
        status: mapStatus(row.status, null),
        updatedAt: row.updated_at,
      })
      transactions.set(row.payment_attempt_id, current)
    }
    const jobsResult = await client.from('payment_jobs')
      .select('id, attempt_id, status, last_error, updated_at')
      .in('attempt_id', rows.map((row) => row.id))
      .order('updated_at', { ascending: false })
    if (jobsResult.error !== null) throw new RepositoryError('No fue posible consultar los trabajos de pago')
    const latestJobs = new Map<string, any>()
    for (const job of jobsResult.data ?? []) if (!latestJobs.has(job.attempt_id)) latestJobs.set(job.attempt_id, job)

    const attemptNumbersResult = await client.from('payment_attempts').select('id, order_id, created_at').order('created_at', { ascending: true })
    if (attemptNumbersResult.error !== null) throw new RepositoryError('No fue posible ordenar los intentos de pago')
    const counters = new Map<string, number>()
    const attemptNumbers = new Map<string, number>()
    for (const row of attemptNumbersResult.data ?? []) {
      const number = (counters.get(row.order_id) ?? 0) + 1
      counters.set(row.order_id, number)
      attemptNumbers.set(row.id, number)
    }
    const items = rows
      .map((row) => mapAttempt({ ...row, transactions: transactions.get(row.id) ?? [] }, attemptNumbers.get(row.id) ?? 1, latestJobs.get(row.id) ?? null, filters.status === 'all' || filters.status === 'dead_letter'))
      .filter((item) => filters.status === 'all' || item.status === filters.status)
    return { items, totalItems: filters.status === 'dead_letter' ? items.length : result.count }
  }

  public async findAttempt(attemptId: string): Promise<AdminPaymentAttemptRecord | null> {
    const client = this.client as unknown as QueryClient
    const result = await client.from('payment_attempts')
      .select('id, order_id, amount, currency, provider_order_id, provider_payment_id, provider_status, provider_updated_at, reservation_expires_at, last_error, status, created_at, updated_at, orders(order_number)')
      .eq('id', attemptId)
      .maybeSingle()
    if (result.error !== null) throw new RepositoryError('No fue posible consultar el intento de pago')
    if (result.data === null) return null
    const jobs = await client.from('payment_jobs').select('id, status, last_error, updated_at').eq('attempt_id', attemptId).order('updated_at', { ascending: false }).limit(1)
    if (jobs.error !== null) throw new RepositoryError('No fue posible consultar el trabajo de pago')
    const transactions = await client.from('payment_transactions')
      .select('id, payment_attempt_id, provider_payment_id, amount, currency, payment_type_id, status, provider_status, provider_updated_at, review_required, last_error, updated_at')
      .eq('payment_attempt_id', attemptId)
      .order('updated_at', { ascending: false })
    if (transactions.error !== null) throw new RepositoryError('No fue posible consultar las transacciones de pago')
    return mapAttempt({ ...result.data, transactions: (transactions.data ?? []).map((row: any) => ({
      amount: Number(row.amount),
      currency: row.currency,
      id: row.id,
      lastError: row.last_error,
      paymentTypeId: row.payment_type_id,
      providerPaymentId: row.provider_payment_id,
      providerStatus: row.provider_status,
      providerUpdatedAt: row.provider_updated_at,
      reviewRequired: row.review_required,
      status: mapStatus(row.status, null),
      updatedAt: row.updated_at,
    })) }, 1, jobs.data?.[0] ?? null)
  }

  public async findAuditEvents(attemptIds: readonly string[]): Promise<ReadonlyMap<string, readonly IAdminPaymentAuditEvent[]>> {
    if (attemptIds.length === 0) return new Map()
    const client = this.client as unknown as QueryClient
    const result = await client.from('audit_logs').select('entity_id, action, metadata, created_at, actor_profile_id').eq('entity_type', 'payment_attempt').in('entity_id', attemptIds).order('created_at', { ascending: true })
    if (result.error !== null) throw new RepositoryError('No fue posible consultar la auditoría de pagos')
    const events = new Map<string, IAdminPaymentAuditEvent[]>()
    for (const row of result.data ?? []) {
      const metadata = row.metadata ?? {}
      const event = {
        actor: row.actor_profile_id ?? 'Sistema',
        createdAt: row.created_at,
        description: typeof metadata.description === 'string' ? metadata.description : row.action,
        type: row.action,
      }
      const current = events.get(row.entity_id) ?? []
      current.push(event)
      events.set(row.entity_id, current)
    }
    return events
  }

  public async retryJob(attemptId: string, reason: string): Promise<boolean> {
    const client = this.client as unknown as QueryClient
    const result = await client.from('payment_jobs').update({ status: 'pending', run_at: new Date().toISOString(), lease_expires_at: null, lease_owner: null, last_error: reason.slice(0, 500) }).eq('attempt_id', attemptId).in('status', ['dead_letter', 'manual_review']).select('id')
    if (result.error !== null) throw new RepositoryError('No fue posible reprogramar el pago')
    return Array.isArray(result.data) && result.data.length === 1
  }

  public async recordSync(attemptId: string, actorProfileId: string): Promise<boolean> {
    const client = this.client as unknown as QueryClient
    const audit = await client.from('audit_logs').insert({
      actor_profile_id: actorProfileId,
      action: 'payment_sync',
      entity_type: 'payment_attempt',
      entity_id: attemptId,
      metadata: { description: 'Sincronización administrativa ejecutada' },
    }).select('id')
    if (audit.error !== null) throw new RepositoryError('No fue posible registrar la sincronización del pago')
    return true
  }

  public async reviewAttempt(attemptId: string, decision: 'acknowledge' | 'retry', note: string, actorProfileId: string): Promise<boolean> {
    const recorded = await this.recordReview(attemptId, note, decision, actorProfileId)
    if (!recorded) return false
    if (decision === 'retry') return this.retryJob(attemptId, note)
    return true
  }

  public async recordReview(attemptId: string, note: string, decision: 'acknowledge' | 'retry', actorProfileId: string): Promise<boolean> {
    const client = this.client as unknown as QueryClient
    const audit = await client.from('audit_logs').insert({ actor_profile_id: actorProfileId, action: `payment_${decision}`, entity_type: 'payment_attempt', entity_id: attemptId, metadata: { description: note.slice(0, 500), decision } }).select('id')
    if (audit.error !== null) throw new RepositoryError('No fue posible registrar la revisión del pago')
    return true
  }
}
