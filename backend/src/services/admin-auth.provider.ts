import {
  createClient,
  type AuthError,
  type Session,
} from '@supabase/supabase-js'

import type { ServerSupabaseClient } from '../config/supabase.js'
import type { IDatabase } from '../types/database.js'
import type {
  AdminRefreshResult,
  AdminSignInResult,
  AdminTokenValidationResult,
  IAdminAuthIdentity,
} from '../types/admin-auth.js'
import { AppError } from '../utils/app-error.js'

export interface IAdminAuthProvider {
  getUser(accessToken: string): Promise<AdminTokenValidationResult>
  refresh(refreshToken: string): Promise<AdminRefreshResult>
  signIn(email: string, password: string): Promise<AdminSignInResult>
  signOut(accessToken: string, refreshToken: string): Promise<void>
}

function isCredentialError(error: AuthError): boolean {
  return error.status === 400 || error.status === 401 || error.status === 403
}

function toIdentity(session: Session | null): IAdminAuthIdentity {
  if (
    session === null ||
    session.expires_at === undefined ||
    session.refresh_token.length === 0
  ) {
    throw new AppError(
      503,
      'No pudimos iniciar la sesión administrativa',
      'ADMIN_AUTH_UNAVAILABLE',
    )
  }

  return {
    tokens: {
      accessToken: session.access_token,
      expiresAt: new Date(session.expires_at * 1_000),
      refreshToken: session.refresh_token,
    },
    userId: session.user.id,
  }
}

export class SupabaseAdminAuthProvider implements IAdminAuthProvider {
  public constructor(
    private readonly supabaseUrl: string,
    private readonly supabaseKey: string,
  ) {}

  public async signIn(email: string, password: string): Promise<AdminSignInResult> {
    const client = this.createClient()
    const { data, error } = await client.auth.signInWithPassword({ email, password })

    if (error !== null) {
      if (isCredentialError(error)) {
        return { status: 'invalid_credentials' }
      }

      throw new AppError(503, 'No pudimos validar tus credenciales', 'ADMIN_AUTH_UNAVAILABLE')
    }

    return { identity: toIdentity(data.session), status: 'authenticated' }
  }

  public async getUser(accessToken: string): Promise<AdminTokenValidationResult> {
    const { data, error } = await this.createClient().auth.getUser(accessToken)

    if (error !== null) {
      if (isCredentialError(error)) {
        return { status: 'invalid_token' }
      }

      throw new AppError(503, 'No pudimos validar tu sesión', 'ADMIN_AUTH_UNAVAILABLE')
    }

    return { status: 'authenticated', userId: data.user.id }
  }

  public async refresh(refreshToken: string): Promise<AdminRefreshResult> {
    const { data, error } = await this.createClient().auth.refreshSession({ refresh_token: refreshToken })

    if (error !== null) {
      if (isCredentialError(error)) {
        return { status: 'invalid_token' }
      }

      throw new AppError(503, 'No pudimos renovar tu sesión', 'ADMIN_AUTH_UNAVAILABLE')
    }

    return { identity: toIdentity(data.session), status: 'authenticated' }
  }

  public async signOut(accessToken: string, refreshToken: string): Promise<void> {
    const client = this.createClient()
    const { error: sessionError } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (sessionError !== null) {
      return
    }

    await client.auth.signOut({ scope: 'local' })
  }

  private createClient(): ServerSupabaseClient {
    return createClient<IDatabase>(this.supabaseUrl, this.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: {
        headers: { 'X-Client-Info': 'margarita-api-admin-auth/0.1.0' },
      },
    })
  }
}
