import type { ServerSupabaseClient } from '../config/supabase.js'
import { RepositoryError } from '../utils/app-error.js'

export interface PaymentReservationExpiryResult {
  examined: number
  released: number
  approved: number
}

export interface IPaymentReservationsRepository {
  releaseExpired(limit: number): Promise<PaymentReservationExpiryResult>
}

export class PaymentReservationsRepository implements IPaymentReservationsRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async releaseExpired(limit: number): Promise<PaymentReservationExpiryResult> {
    const { data, error } = await this.client.rpc('release_expired_payment_reservations_v2', { p_limit: limit })
    if (error !== null) throw new RepositoryError('No fue posible expirar las reservas de pago')

    const row = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined
    if (row === undefined) throw new RepositoryError('La expiración de reservas devolvió un formato inválido')
    const examined = Number(row.examined_count)
    const released = Number(row.released_count)
    const approved = Number(row.approved_count)
    if (![examined, released, approved].every(Number.isInteger)) {
      throw new RepositoryError('La expiración de reservas devolvió un formato inválido')
    }
    return { examined, released, approved }
  }
}
