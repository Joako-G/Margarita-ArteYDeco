import type { Logger } from 'pino'
import { z } from 'zod'

import type { MercadoPagoConfig } from '../payments/config.js'
import { verifyMercadoPagoWebhookSignature } from '../payments/webhook-signature.js'
import type { IPaymentInboxRepository } from '../repositories/payment-inbox.repository.js'
import { AppError } from '../utils/app-error.js'

const webhookBodySchema = z.object({
  action: z.string().max(200).optional(),
  data: z.object({ id: z.union([z.string(), z.number()]) }).optional(),
  resource: z.union([z.string(), z.number()]).optional(),
  topic: z.string().max(100).optional(),
  type: z.string().max(100).optional(),
}).passthrough()

export interface PaymentWebhookRequest {
  body: Buffer
  correlationId?: string | undefined
  requestId: string | undefined
  signature: string | undefined
  query?: { 'data.id'?: unknown; id?: unknown; topic?: unknown }
}

export type PaymentWebhookResult = { duplicate: boolean }

export interface IPaymentWebhookService {
  receive(request: PaymentWebhookRequest): Promise<PaymentWebhookResult>
}

export class PaymentWebhookService implements IPaymentWebhookService {
  public constructor(
    private readonly repository: IPaymentInboxRepository,
    private readonly config: MercadoPagoConfig,
    private readonly logger: Logger,
  ) {}

  public async receive(request: PaymentWebhookRequest): Promise<PaymentWebhookResult> {
    const correlationId = request.correlationId
    let payload: z.infer<typeof webhookBodySchema>
    try {
      payload = webhookBodySchema.parse(JSON.parse(request.body.toString('utf8')))
    } catch {
      this.logger.warn({ correlationId, stage: 'payload', status: 'rejected' }, 'payment_webhook_payload_rejected')
      throw new AppError(400, 'La notificación no es válida', 'INVALID_WEBHOOK')
    }

    if (this.config.webhookSecret === null) {
      this.logger.error({ correlationId, stage: 'configuration', status: 'unavailable' }, 'payment_webhook_configuration_unavailable')
      throw new AppError(503, 'La configuración de firma de Mercado Pago no es válida', 'PAYMENT_WEBHOOK_MISCONFIGURED')
    }

    const candidates = [request.query?.['data.id'], request.query?.id, payload.data?.id, payload.resource]
    const normalized = candidates.map((value) => {
      if (value === undefined) return undefined
      if (typeof value !== 'string' && typeof value !== 'number') return undefined
      return normalizeResourceId(String(value))
    })
    const resourceId = normalized.find((value) => value !== undefined)
    if (candidates.some((value, index) => value !== undefined && (
      normalized[index] === undefined || normalized[index] !== resourceId
    ))) {
      this.logger.warn({ correlationId, stage: 'signature', status: 'rejected', reason_code: 'id_conflict' }, 'payment_webhook_signature_rejected')
      throw new AppError(401, 'La notificación no es válida', 'INVALID_WEBHOOK')
    }
    const resourceType = normalizeResourceType(
      payload.type ?? payload.topic ?? (typeof request.query?.topic === 'string' ? request.query.topic : undefined),
    )
    const verified = verifyMercadoPagoWebhookSignature({
      dataId: normalized[0],
      requestId: request.requestId,
      resourceId,
      secret: this.config.webhookSecret,
      signature: request.signature,
    })
    if (!verified.valid) {
      this.logger.warn({ correlationId, stage: 'signature', status: 'rejected', reason_code: verified.reasonCode }, 'payment_webhook_signature_rejected')
      throw new AppError(401, 'La notificación no es válida', 'INVALID_WEBHOOK')
    }

    this.logger.info({ correlationId, stage: 'signature', status: 'verified' }, 'payment_webhook_signature_verified')
    try {
      const result = await this.repository.acknowledge({
        environment: this.config.environment,
        requestId: request.requestId as string,
        resourceId: resourceId as string,
        resourceType,
        signatureDigest: verified.digest,
      })
      this.logger.info({ correlationId, stage: 'inbox_rpc', status: 'succeeded', duplicate: result.duplicate }, 'payment_webhook_inbox_succeeded')
      return result
    } catch (error) {
      this.logger.error({ correlationId, stage: 'inbox_rpc', status: 'failed' }, 'payment_webhook_inbox_failed')
      throw error
    }
  }
}

function normalizeResourceId(value: string): string | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  try {
    const url = new URL(trimmed)
    const segment = url.pathname.split('/').filter(Boolean).at(-1)
    return segment === undefined ? undefined : decodeURIComponent(segment)
  } catch {
    return trimmed
  }
}

function normalizeResourceType(value: string | undefined): string {
  return value?.trim().toLowerCase() === 'merchant_order' ? 'merchant_order' : value?.trim() || 'unknown'
}
