import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const NONCE_BYTES = 32
const SIGNATURE_BYTES = 32

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export interface ICsrfService {
  createToken(): string
  verifyToken(token: string): boolean
}

export class CsrfService implements ICsrfService {
  public constructor(private readonly secret: string) {}

  public createToken(): string {
    const nonce = randomBytes(NONCE_BYTES).toString('base64url')
    return `${nonce}.${this.sign(nonce)}`
  }

  public verifyToken(token: string): boolean {
    const parts = token.split('.')

    if (parts.length !== 2) {
      return false
    }

    const [nonce, signature] = parts

    if (
      nonce === undefined ||
      signature === undefined ||
      Buffer.from(nonce, 'base64url').length !== NONCE_BYTES ||
      Buffer.from(signature, 'base64url').length !== SIGNATURE_BYTES
    ) {
      return false
    }

    return safeEqual(signature, this.sign(nonce))
  }

  private sign(nonce: string): string {
    return createHmac('sha256', this.secret)
      .update('margarita-csrf-v1\0')
      .update(nonce)
      .digest('base64url')
  }
}
