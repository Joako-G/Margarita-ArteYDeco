import { createHash } from 'node:crypto'

import { InvalidWebhookSignatureError, SignatureFailureReason, WebhookSignatureValidator } from 'mercadopago'

export const WEBHOOK_MAX_BODY_BYTES = 16 * 1024
export const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000

interface SignatureParts {
  timestamp: number
  value: Buffer
}

function parseVerifiedSignature(value: string | undefined): SignatureParts | null {
  if (value === undefined) return null

  const parts = value.split(',').map((part) => part.trim().split('='))
  const timestampValue = parts.find(([key]) => key?.toLowerCase() === 'ts')?.[1]
  const signatureValue = parts.find(([key]) => key?.toLowerCase() === 'v1')?.[1]
  if (timestampValue === undefined || signatureValue === undefined || !/^[a-f0-9]{64}$/i.test(signatureValue)) return null

  const timestamp = Number(timestampValue)
  const signature = Buffer.from(signatureValue, 'hex')
  return Number.isSafeInteger(timestamp) && signature.length === 32
    ? { timestamp, value: signature }
    : null
}

export type WebhookSignatureResult =
  | { valid: true; digest: Buffer; timestamp: number }
  | { valid: false; reasonCode: 'missing_id' | 'missing_request_id' | 'missing_secret' | 'malformed_signature' | 'expired_timestamp' | 'hmac_mismatch' }

export function verifyMercadoPagoWebhookSignature(input: {
  nowMs?: number
  requestId: string | undefined
  resourceId: string | undefined
  dataId?: string | undefined
  secret: string | null
  signature: string | undefined
}): WebhookSignatureResult {
  if (input.resourceId === undefined) return { valid: false, reasonCode: 'missing_id' }
  if (input.secret === null) return { valid: false, reasonCode: 'missing_secret' }
  if (input.requestId === undefined) return { valid: false, reasonCode: 'missing_request_id' }

  const nowMs = input.nowMs ?? Date.now()
  try {
    WebhookSignatureValidator.validate({
      dataId: input.dataId ?? input.resourceId,
      now: () => nowMs,
      secret: input.secret,
      toleranceSeconds: WEBHOOK_REPLAY_WINDOW_MS / 1000,
      xRequestId: input.requestId,
      xSignature: input.signature,
    })
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return { valid: false, reasonCode: mapFailureReason(error.reason, input.signature) }
    }
    return { valid: false, reasonCode: 'malformed_signature' }
  }

  const parsed = parseVerifiedSignature(input.signature)
  if (parsed === null) return { valid: false, reasonCode: 'malformed_signature' }

  return { valid: true, digest: createHash('sha256').update(parsed.value).digest(), timestamp: parsed.timestamp }
}

function mapFailureReason(
  reason: SignatureFailureReason,
  signature: string | undefined,
): Extract<WebhookSignatureResult, { valid: false }>['reasonCode'] {
  switch (reason) {
    case SignatureFailureReason.TimestampOutOfTolerance:
      return 'expired_timestamp'
    case SignatureFailureReason.SignatureMismatch:
      return hasValidV1HashFormat(signature) ? 'hmac_mismatch' : 'malformed_signature'
    case SignatureFailureReason.MissingHash:
      return 'malformed_signature'
    case SignatureFailureReason.MissingSignatureHeader:
    case SignatureFailureReason.MalformedSignatureHeader:
    case SignatureFailureReason.MissingTimestamp:
      return 'malformed_signature'
  }
}

function hasValidV1HashFormat(signature: string | undefined): boolean {
  const value = signature?.split(',')
    .map((part) => part.trim().split('='))
    .find(([key]) => key?.toLowerCase() === 'v1')?.[1]
  return value !== undefined && /^[a-f0-9]{64}$/i.test(value)
}
