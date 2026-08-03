import type { ServerSupabaseClient } from '../config/supabase.js'
import type { IGuestSessionRow } from '../types/guest-session.js'
import { recoveredGuestSessionSchema } from '../schemas/orders.schema.js'
import { RepositoryError } from '../utils/app-error.js'

export interface IGuestSessionRepository {
  create(tokenHash: string, expiresAt: Date): Promise<IGuestSessionRow>
  findActiveByTokenHash(tokenHash: string, now: Date): Promise<IGuestSessionRow | null>
  recover(
    currentSessionId: string | null,
    orderId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<IGuestSessionRow>
  revoke(id: string, revokedAt: Date): Promise<void>
  touch(id: string): Promise<void>
}

export class GuestSessionRepository implements IGuestSessionRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async create(tokenHash: string, expiresAt: Date): Promise<IGuestSessionRow> {
    const { data, error } = await this.client
      .from('guest_sessions')
      .insert({
        expires_at: expiresAt.toISOString(),
        token_hash: tokenHash,
      })
      .select('id, expires_at, revoked_at')
      .single()

    if (error !== null || data === null) {
      throw new RepositoryError('No fue posible crear la sesión de compra')
    }

    return { expiresAt: data.expires_at, id: data.id, revokedAt: data.revoked_at }
  }

  public async findActiveByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<IGuestSessionRow | null> {
    const { data, error } = await this.client
      .from('guest_sessions')
      .select('id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .gt('expires_at', now.toISOString())
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError('No fue posible validar la sesión de compra')
    }

    return data === null
      ? null
      : { expiresAt: data.expires_at, id: data.id, revokedAt: data.revoked_at }
  }

  public async revoke(id: string, revokedAt: Date): Promise<void> {
    void revokedAt
    const { error } = await this.client.rpc('revoke_guest_session', {
      p_guest_session_id: id,
    })

    if (error !== null) {
      throw new RepositoryError('No fue posible revocar la sesión de compra')
    }
  }

  public async recover(
    currentSessionId: string | null,
    orderId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<IGuestSessionRow> {
    const { data, error } = await this.client.rpc('recover_order_guest_session', {
      p_current_session_id: currentSessionId,
      p_expires_at: expiresAt.toISOString(),
      p_order_id: orderId,
      p_token_hash: tokenHash,
    })

    if (error !== null) {
      throw new RepositoryError('No fue posible recuperar la sesión de compra')
    }

    const parsed = recoveredGuestSessionSchema.safeParse(data?.[0])

    if (!parsed.success) {
      throw new RepositoryError('La recuperación de sesión devolvió un formato inválido')
    }

    return {
      expiresAt: parsed.data.expires_at,
      id: parsed.data.guest_session_id,
      revokedAt: null,
    }
  }

  public async touch(id: string): Promise<void> {
    const { error } = await this.client.rpc('touch_guest_session', {
      p_guest_session_id: id,
    })

    if (error !== null) {
      throw new RepositoryError('No fue posible actualizar la sesión de compra')
    }
  }
}
