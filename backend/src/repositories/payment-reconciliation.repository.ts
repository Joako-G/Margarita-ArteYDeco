import type { ServerSupabaseClient } from '../config/supabase.js'
import type { ProviderPayment, ReconciledPaymentState } from '../payments/types.js'
import { RepositoryError } from '../utils/app-error.js'

export interface PaymentAttemptForReconciliation {
  amount: number
  currency: string
  externalReference: string
  id: string
  orderId: string
  providerPreferenceId: string | null
  providerPaymentId: string | null
  providerVersion: number | null
  status: ReconciledPaymentState
}

export interface PaymentTransition {
  providerStatus: string
  providerUpdatedAt: string | null
  providerVersion: number | null
  status: ReconciledPaymentState
}

export interface PaymentTransactionRecord {
  amount: number
  currency: string
  id: string
  paymentAttemptId: string
  paymentTypeId: string | null
  providerPaymentId: string
  providerStatus: string | null
  providerUpdatedAt: string | null
  providerVersion: number | null
  reviewRequired: boolean
  status: Exclude<ReconciledPaymentState, 'in_process'>
  updatedAt: string
}

export interface IPaymentReconciliationRepository {
  findAttempt(attemptId: string): Promise<PaymentAttemptForReconciliation>
  findExpiredAttempts(limit: number, now: Date): Promise<PaymentAttemptForReconciliation[]>
  findAttemptByExternalReference(environment: 'sandbox' | 'production', externalReference: string): Promise<PaymentAttemptForReconciliation | null>
  recordProviderPaymentId(attemptId: string, paymentId: string): Promise<void>
  recordProviderLookupState?(attemptId: string, state: 'not_found' | 'unavailable'): Promise<void>
  findProviderTransaction?(environment: 'sandbox' | 'production', paymentId: string): Promise<PaymentTransactionRecord | null>
  listProviderTransactions?(attemptId: string): Promise<readonly PaymentTransactionRecord[]>
  upsertProviderTransaction?(attemptId: string, environment: 'sandbox' | 'production', payment: ProviderPayment, reviewRequired: boolean, lastError: string | null): Promise<PaymentTransactionRecord>
  transitionProviderTransaction?(
    transaction: PaymentTransactionRecord,
    transition: PaymentTransition,
    reviewRequired: boolean,
    lastError: string | null,
  ): Promise<{ transition: 'applied' | 'stale'; status: ReconciledPaymentState }>
  transition(
    attempt: PaymentAttemptForReconciliation,
    transition: PaymentTransition,
  ): Promise<'applied' | 'stale'>
}

export class PaymentReconciliationRepository implements IPaymentReconciliationRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findAttempt(attemptId: string): Promise<PaymentAttemptForReconciliation> {
    const { data, error } = await this.client
      .from('payment_attempts')
      .select('id, order_id, amount, currency, external_reference, provider_preference_id, provider_payment_id, provider_version, status')
      .eq('id', attemptId)
      .maybeSingle()

    if (error !== null || data === null) throw new RepositoryError('No fue posible obtener el intento de pago')

    return {
      amount: Number(data.amount),
      currency: data.currency,
      externalReference: data.external_reference,
      id: data.id,
      orderId: data.order_id,
      providerPreferenceId: data.provider_preference_id,
      providerPaymentId: data.provider_payment_id,
      providerVersion: data.provider_version,
      status: data.status === 'cancelled' ? 'expired' : data.status,
    }
  }

  public async findExpiredAttempts(limit: number, now: Date): Promise<PaymentAttemptForReconciliation[]> {
    const { data, error } = await this.client
      .from('payment_attempts')
      .select('id, order_id, amount, currency, external_reference, provider_preference_id, provider_payment_id, provider_version, status')
      .lte('reservation_expires_at', now.toISOString())
      .in('status', ['pending', 'rejected'])
      .order('reservation_expires_at', { ascending: true })
      .limit(limit)

    if (error !== null || !Array.isArray(data)) throw new RepositoryError('No fue posible obtener las reservas expiradas')
    return data.map((row) => ({
      amount: Number(row.amount),
      currency: row.currency,
      externalReference: row.external_reference,
      id: row.id,
      orderId: row.order_id,
      providerPreferenceId: row.provider_preference_id,
      providerPaymentId: row.provider_payment_id,
      providerVersion: row.provider_version,
      status: row.status === 'cancelled' ? 'expired' : row.status,
    }))
  }

  public async findAttemptByExternalReference(
    environment: 'sandbox' | 'production',
    externalReference: string,
  ): Promise<PaymentAttemptForReconciliation | null> {
    const { data, error } = await this.client
      .from('payment_attempts')
      .select('id, order_id, amount, currency, external_reference, provider_preference_id, provider_payment_id, provider_version, status')
      .eq('environment', environment)
      .eq('external_reference', externalReference)
      .limit(2)

    if (error !== null) throw new RepositoryError('No fue posible resolver el intento de pago')
    if (!Array.isArray(data) || data.length !== 1) return null
    const row = data[0]!
    return {
      amount: Number(row.amount),
      currency: row.currency,
      externalReference: row.external_reference,
      id: row.id,
      orderId: row.order_id,
      providerPreferenceId: row.provider_preference_id,
      providerPaymentId: row.provider_payment_id,
      providerVersion: row.provider_version,
      status: row.status === 'cancelled' ? 'expired' : row.status,
    }
  }

  public async recordProviderPaymentId(attemptId: string, paymentId: string): Promise<void> {
    const { error } = await this.client
      .from('payment_attempts')
      .update({ provider_payment_id: paymentId })
      .eq('id', attemptId)
      .is('provider_payment_id', null)
    if (error !== null) throw new RepositoryError('No fue posible vincular el pago externo')
  }

  public async recordProviderLookupState(attemptId: string, state: 'not_found' | 'unavailable'): Promise<void> {
    let query = this.client
      .from('payment_attempts')
      .update({ provider_status: state })
      .eq('id', attemptId)
    query = state === 'not_found'
      ? query.is('provider_payment_id', null)
      : query.neq('status', 'approved')
    const { error } = await query
    if (error !== null) throw new RepositoryError('No fue posible registrar el resultado de la consulta de pago')
  }

  public async findProviderTransaction(
    environment: 'sandbox' | 'production',
    paymentId: string,
  ): Promise<PaymentTransactionRecord | null> {
    const { data, error } = await this.client
      .from('payment_transactions')
      .select('id, payment_attempt_id, provider_payment_id, amount, currency, payment_type_id, status, provider_status, provider_updated_at, provider_version, review_required, updated_at')
      .eq('environment', environment)
      .eq('provider_payment_id', paymentId)
      .maybeSingle()
    if (error !== null) throw new RepositoryError('No fue posible consultar la transacción externa')
    return data === null ? null : this.mapTransaction(data)
  }

  public async listProviderTransactions(attemptId: string): Promise<readonly PaymentTransactionRecord[]> {
    const { data, error } = await this.client
      .from('payment_transactions')
      .select('id, payment_attempt_id, provider_payment_id, amount, currency, payment_type_id, status, provider_status, provider_updated_at, provider_version, review_required, updated_at')
      .eq('payment_attempt_id', attemptId)
      .order('updated_at', { ascending: false })
    if (error !== null || !Array.isArray(data)) throw new RepositoryError('No fue posible consultar las transacciones externas')
    return data.map((row) => this.mapTransaction(row))
  }

  public async upsertProviderTransaction(
    attemptId: string,
    environment: 'sandbox' | 'production',
    payment: ProviderPayment,
    reviewRequired: boolean,
    lastError: string | null,
  ): Promise<PaymentTransactionRecord> {
    const { data, error } = await this.client
      .from('payment_transactions')
      .upsert({
        payment_attempt_id: attemptId,
        provider: 'mercado_pago',
        environment,
        provider_payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency as 'ARS',
        payment_type_id: payment.paymentTypeId,
        status: normalizeTransactionStatus(payment.status),
        provider_status: payment.status,
        provider_updated_at: payment.updatedAt,
        provider_version: payment.version,
        review_required: reviewRequired,
        last_error: lastError,
      }, { onConflict: 'provider,environment,provider_payment_id' })
      .select('id, payment_attempt_id, provider_payment_id, amount, currency, payment_type_id, status, provider_status, provider_updated_at, provider_version, review_required, updated_at')
      .single()
    if (error !== null || data === null) throw new RepositoryError('No fue posible guardar la transacción externa')
    return this.mapTransaction(data)
  }

  public async transitionProviderTransaction(
    transaction: PaymentTransactionRecord,
    transition: PaymentTransition,
    reviewRequired: boolean,
    lastError: string | null,
  ): Promise<{ transition: 'applied' | 'stale'; status: ReconciledPaymentState }> {
    const { data, error } = await this.client.rpc('reconcile_payment_transaction_v1', {
      p_transaction_id: transaction.id,
      p_expected_status: transaction.status,
      p_expected_provider_version: transaction.providerVersion,
      p_next_status: transition.status === 'in_process' ? 'pending' : transition.status,
      p_provider_status: transition.providerStatus,
      p_provider_updated_at: transition.providerUpdatedAt,
      p_provider_version: transition.providerVersion,
      p_review_required: reviewRequired,
      p_last_error: lastError,
    })
    if (error !== null) throw new RepositoryError('No fue posible guardar el estado de la transacción')
    const row = Array.isArray(data) ? data[0] as { aggregate_status?: ReconciledPaymentState | 'cancelled'; transition_applied?: boolean } | undefined : undefined
    return {
      status: row?.aggregate_status === 'cancelled' ? 'expired' : row?.aggregate_status ?? 'manual_review',
      transition: row?.transition_applied === true ? 'applied' : 'stale',
    }
  }

  public async transition(
    attempt: PaymentAttemptForReconciliation,
    transition: PaymentTransition,
  ): Promise<'applied' | 'stale'> {
    const { data, error } = await this.client.rpc('transition_payment_attempt_v2', {
      p_attempt_id: attempt.id,
      p_provider_status: transition.providerStatus,
      p_provider_updated_at: transition.providerUpdatedAt,
      p_provider_version: transition.providerVersion,
      p_expected_status: attempt.status === 'in_process' ? 'pending' : attempt.status,
      p_expected_provider_version: attempt.providerVersion,
      p_next_status: transition.status === 'in_process' ? 'pending' : transition.status,
    })
    if (error !== null) throw new RepositoryError('No fue posible guardar el estado del pago')
    const row = Array.isArray(data) ? data[0] as { transition_applied?: boolean } | undefined : undefined
    return row?.transition_applied === true ? 'applied' : 'stale'
  }

  private mapTransaction(row: {
    amount: number | string
    currency: string
    id: string
    payment_attempt_id: string
    payment_type_id: string | null
    provider_payment_id: string
    provider_status: string | null
    provider_updated_at: string | null
    provider_version: number | null
    review_required: boolean
    status: ReconciledPaymentState | 'cancelled'
    updated_at: string
  }): PaymentTransactionRecord {
    return {
      amount: Number(row.amount),
      currency: row.currency,
      id: row.id,
      paymentAttemptId: row.payment_attempt_id,
      paymentTypeId: row.payment_type_id,
      providerPaymentId: row.provider_payment_id,
      providerStatus: row.provider_status,
      providerUpdatedAt: row.provider_updated_at,
      providerVersion: row.provider_version,
      reviewRequired: row.review_required,
      status: row.status === 'cancelled' ? 'expired' : row.status === 'in_process' ? 'pending' : row.status,
      updatedAt: row.updated_at,
    }
  }
}

function normalizeTransactionStatus(status: string): Exclude<ReconciledPaymentState, 'in_process'> {
  switch (status.toLowerCase()) {
    case 'approved': return 'approved'
    case 'rejected': return 'rejected'
    case 'cancelled': return 'expired'
    case 'pending': return 'pending'
    case 'in_process': return 'pending'
    default: return 'manual_review'
  }
}
