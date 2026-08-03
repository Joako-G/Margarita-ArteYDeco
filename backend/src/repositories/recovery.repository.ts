import type { ServerSupabaseClient } from '../config/supabase.js'
import { recoveryLimitSchema } from '../schemas/orders.schema.js'
import type {
  IRecoveryFingerprints,
  IRecoveryLimit,
  IRecoveryLimitConfig,
} from '../types/recovery.js'
import { RepositoryError } from '../utils/app-error.js'

export interface IRecoveryRepository {
  checkLimit(
    fingerprints: IRecoveryFingerprints,
    config: IRecoveryLimitConfig,
  ): Promise<IRecoveryLimit>
  clearFailures(fingerprints: IRecoveryFingerprints): Promise<void>
  registerFailure(
    fingerprints: IRecoveryFingerprints,
    config: IRecoveryLimitConfig,
  ): Promise<IRecoveryLimit>
}

function intervalFromMilliseconds(milliseconds: number): string {
  return `${milliseconds} milliseconds`
}

export class RecoveryRepository implements IRecoveryRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async checkLimit(
    fingerprints: IRecoveryFingerprints,
    config: IRecoveryLimitConfig,
  ): Promise<IRecoveryLimit> {
    const { data, error } = await this.client.rpc('get_public_recovery_limit', {
      p_captcha_threshold: config.captchaThreshold,
      p_ip_fingerprint: fingerprints.ip,
      p_order_fingerprint: fingerprints.orderPhone,
      p_window: intervalFromMilliseconds(config.windowMs),
    })

    if (error !== null) {
      throw new RepositoryError('No fue posible validar el límite de recuperación')
    }

    return this.parseLimit(data?.[0])
  }

  public async clearFailures(fingerprints: IRecoveryFingerprints): Promise<void> {
    const { error } = await this.client.rpc('clear_public_recovery_failures', {
      p_ip_fingerprint: fingerprints.ip,
      p_order_fingerprint: fingerprints.orderPhone,
    })

    if (error !== null) {
      throw new RepositoryError('No fue posible limpiar los intentos de recuperación')
    }
  }

  public async registerFailure(
    fingerprints: IRecoveryFingerprints,
    config: IRecoveryLimitConfig,
  ): Promise<IRecoveryLimit> {
    const { data, error } = await this.client.rpc('register_public_recovery_failure', {
      p_block_duration: intervalFromMilliseconds(config.blockDurationMs),
      p_captcha_threshold: config.captchaThreshold,
      p_ip_fingerprint: fingerprints.ip,
      p_max_attempts: config.maxAttempts,
      p_order_fingerprint: fingerprints.orderPhone,
      p_window: intervalFromMilliseconds(config.windowMs),
    })

    if (error !== null) {
      throw new RepositoryError('No fue posible registrar el intento de recuperación')
    }

    return this.parseLimit(data?.[0])
  }

  private parseLimit(value: unknown): IRecoveryLimit {
    const parsed = recoveryLimitSchema.safeParse(value)

    if (!parsed.success) {
      throw new RepositoryError('El límite de recuperación devolvió un formato inválido')
    }

    return {
      captchaRequired: parsed.data.captcha_required,
      isBlocked: parsed.data.is_blocked,
      retryAfterSeconds: parsed.data.retry_after_seconds,
    }
  }
}
