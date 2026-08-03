import { randomUUID } from 'node:crypto'

import axios, { type AxiosInstance, isAxiosError } from 'axios'
import type { Logger } from 'pino'

import { turnstileSiteverifyResponseSchema } from '../schemas/turnstile.schema.js'
import type {
  ITurnstileVerificationRequest,
  TurnstileVerificationResultType,
} from '../types/turnstile.js'

const TURNSTILE_ACTION = 'order_recovery'
const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_TIMEOUT_MS = 5_000

export interface ITurnstileService {
  verify(request: ITurnstileVerificationRequest): Promise<TurnstileVerificationResultType>
}

export class TurnstileService implements ITurnstileService {
  public constructor(
    private readonly secretKey: string,
    private readonly allowedHostnames: readonly string[],
    private readonly logger: Logger,
    private readonly client: AxiosInstance = axios.create({ timeout: TURNSTILE_TIMEOUT_MS }),
  ) {}

  public async verify(
    request: ITurnstileVerificationRequest,
  ): Promise<TurnstileVerificationResultType> {
    try {
      const response = await this.client.post(TURNSTILE_SITEVERIFY_URL, {
        idempotency_key: randomUUID(),
        remoteip: request.ipAddress === 'unknown' ? undefined : request.ipAddress,
        response: request.token,
        secret: this.secretKey,
      })
      const parsed = turnstileSiteverifyResponseSchema.safeParse(response.data)

      if (!parsed.success) {
        this.logFailure('invalid_provider_response')
        return 'unavailable'
      }

      if (!parsed.data.success) {
        const isProviderFailure = parsed.data['error-codes'].includes('internal-error')
        this.logFailure(isProviderFailure ? 'provider_error' : 'challenge_rejected')
        return isProviderFailure ? 'unavailable' : 'invalid'
      }

      if (
        parsed.data.action !== TURNSTILE_ACTION
        || parsed.data.hostname === undefined
        || !this.allowedHostnames.includes(parsed.data.hostname.toLowerCase())
      ) {
        this.logFailure('challenge_context_mismatch')
        return 'invalid'
      }

      return 'valid'
    } catch (error) {
      this.logger.warn(
        {
          code: isAxiosError(error) ? error.code : 'UNKNOWN',
          statusCode: isAxiosError(error) ? error.response?.status : undefined,
        },
        'No fue posible validar Turnstile',
      )
      return 'unavailable'
    }
  }

  private logFailure(reason: string): void {
    this.logger.warn({ reason }, 'La validación de Turnstile no fue aceptada')
  }
}
