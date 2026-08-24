import { createHmac } from 'node:crypto'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, nestedValue]) => [key, canonicalize(nestedValue)]),
    )
  }
  return value
}

function encodeBase32(input: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of input) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += CODE_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += CODE_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

export interface IConsumerWithdrawalSecurityMaterial {
  contactFingerprint: string
  idempotencyKeyHash: string
  payloadFingerprint: string
  publicCode: string
  publicCodeHash: string
  publicCodeSuffix: string
}

export interface IConsumerWithdrawalAdminIdempotencyMaterial {
  idempotencyExpiresAt: string
  idempotencyKeyHash: string
  payloadFingerprint: string
}

export class ConsumerWithdrawalProtectionService {
  public constructor(private readonly secret: string) {}

  public createMaterial(
    idempotencyKey: string,
    payload: Readonly<Record<string, unknown>>,
    phoneNormalized: string,
  ): IConsumerWithdrawalSecurityMaterial {
    const canonicalPayload = JSON.stringify(
      Object.keys(payload).sort().map((key) => [key, canonicalize(payload[key])]),
    )
    const payloadFingerprintHex = this.sign('withdrawal-payload-v1', canonicalPayload)
    const codeBytes = Buffer.from(this.sign(
      'withdrawal-public-code-v1',
      `${idempotencyKey}\0${payloadFingerprintHex}`,
    ), 'hex').subarray(0, 17)
    const encoded = encodeBase32(codeBytes).slice(0, 26)
    const publicCode = `AR-${encoded.slice(0, 5)}-${encoded.slice(5, 10)}-${encoded.slice(10, 15)}-${encoded.slice(15, 20)}-${encoded.slice(20)}`

    return {
      contactFingerprint: this.sign('withdrawal-contact-v1', phoneNormalized),
      idempotencyKeyHash: this.sign('withdrawal-idempotency-v1', idempotencyKey),
      payloadFingerprint: payloadFingerprintHex,
      publicCode,
      publicCodeHash: this.hashPublicCode(publicCode),
      publicCodeSuffix: encoded.slice(-6),
    }
  }

  public createAdminIdempotencyMaterial(
    idempotencyKey: string,
    operation: string,
    payload: Readonly<Record<string, unknown>>,
  ): IConsumerWithdrawalAdminIdempotencyMaterial {
    const canonicalPayload = JSON.stringify(
      Object.keys(payload).sort().map((key) => [key, canonicalize(payload[key])]),
    )
    return {
      idempotencyExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      idempotencyKeyHash: this.sign('withdrawal-admin-idempotency-v1', idempotencyKey),
      payloadFingerprint: this.sign(
        'withdrawal-admin-payload-v1',
        `${operation}\0${canonicalPayload}`,
      ),
    }
  }

  public hashPublicCode(publicCode: string): string {
    return this.sign('withdrawal-code-lookup-v1', publicCode.trim().toUpperCase())
  }

  public fingerprintIp(ipAddress: string): string {
    return this.sign('withdrawal-ip-v1', ipAddress)
  }

  private sign(domain: string, value: string): string {
    return createHmac('sha256', this.secret).update(domain).update('\0').update(value).digest('hex')
  }
}
