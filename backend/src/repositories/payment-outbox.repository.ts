import type { ServerSupabaseClient } from '../config/supabase.js'
import type { PaymentFailureDisposition } from '../payments/retry-policy.js'
import { RepositoryError } from '../utils/app-error.js'

export interface PaymentOutboxOperation {
  attempts: number
  availableAt: string
  id: string
  idempotencyKey: string
  leaseExpiresAt: string
  leaseOwner: string
  operation: 'create_order'
  payload: Record<string, unknown>
  reservationExpiresAt: string | null
  attemptId: string
}

export interface PaymentOutboxUpdate {
  availableAt: Date | null
  disposition: PaymentFailureDisposition
  error: string
}

export interface IPaymentOutboxRepository {
  claim(workerId: string): Promise<PaymentOutboxOperation | null>
  complete(id: string, workerId: string): Promise<boolean>
  recordFailure(id: string, update: PaymentOutboxUpdate, workerId: string): Promise<boolean>
}

export class PaymentOutboxRepository implements IPaymentOutboxRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async claim(workerId: string): Promise<PaymentOutboxOperation | null> {
    const { data, error } = await (this.client as never as {
      rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message?: string } | null }>
    }).rpc('claim_payment_outbox_v2', { p_lease: '5 minutes', p_worker_id: workerId })
    if (error !== null) throw new RepositoryError('No fue posible reclamar el despacho del pago')
    const row = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined
    if (row === undefined) return null
    return {
      attempts: Number(row.attempts),
      availableAt: String(row.available_at),
      id: String(row.outbox_id),
      idempotencyKey: String(row.idempotency_key),
      leaseExpiresAt: String(row.lease_expires_at),
      leaseOwner: workerId,
      operation: row.operation as 'create_order',
      payload: (row.payload ?? {}) as Record<string, unknown>,
      reservationExpiresAt: row.reservation_expires_at === null ? null : typeof row.reservation_expires_at === 'string' ? row.reservation_expires_at : null,
      attemptId: String(row.attempt_id),
    }
  }

  public async complete(id: string, workerId: string): Promise<boolean> {
    const { data, error } = await (this.client as never as {
      rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message?: string } | null }>
    }).rpc('complete_payment_outbox_v2', { p_outbox_id: id, p_worker_id: workerId, p_status: 'succeeded' })
    if (error !== null) throw new RepositoryError('No fue posible finalizar el despacho del pago')
    return data === true || (Array.isArray(data) && (data[0] as { complete_payment_outbox_v2?: boolean } | undefined)?.complete_payment_outbox_v2 === true)
  }

  public async recordFailure(id: string, update: PaymentOutboxUpdate, workerId: string): Promise<boolean> {
    const { data, error } = await (this.client as never as {
      rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message?: string } | null }>
    }).rpc('complete_payment_outbox_v2', {
      p_outbox_id: id,
      p_worker_id: workerId,
      p_status: update.disposition === 'retry' ? 'pending' : update.disposition,
      p_run_at: update.availableAt?.toISOString() ?? null,
      p_error: update.error,
    })
    if (error !== null) throw new RepositoryError('No fue posible actualizar el despacho del pago')
    return data === true || (Array.isArray(data) && (data[0] as { complete_payment_outbox_v2?: boolean } | undefined)?.complete_payment_outbox_v2 === true)
  }
}
