import { createHash, randomBytes } from 'node:crypto'

import type { IGuestSessionRepository } from '../repositories/guest-sessions.repository.js'
import type { IGuestSessionContext } from '../types/guest-session.js'

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000 - 5 * 60 * 1_000
const TOKEN_BYTES = 32
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

function hashToken(token: string): string {
  const hex = createHash('sha256').update(token, 'utf8').digest('hex')
  return `\\x${hex}`
}

export interface IGuestSessionService {
  getOrCreate(token: string | null): Promise<IGuestSessionContext>
  resolve(token: string | null, touch?: boolean): Promise<IGuestSessionContext | null>
  rotateForRecovery(
    currentSessionId: string | null,
    orderId: string,
  ): Promise<IGuestSessionContext>
  revokeByToken(token: string | null): Promise<boolean>
  revokeCreatedSession(session: IGuestSessionContext): Promise<void>
}

export class GuestSessionService implements IGuestSessionService {
  public constructor(
    private readonly repository: IGuestSessionRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async getOrCreate(token: string | null): Promise<IGuestSessionContext> {
    const now = this.now()
    const existing = await this.resolve(token)

    if (existing !== null) {
      return existing
    }

    const newToken = randomBytes(TOKEN_BYTES).toString('base64url')
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS)
    const created = await this.repository.create(hashToken(newToken), expiresAt)

    return {
      expiresAt: new Date(created.expiresAt),
      id: created.id,
      tokenToSet: newToken,
    }
  }

  public async resolve(
    token: string | null,
    touch = true,
  ): Promise<IGuestSessionContext | null> {
    if (token === null || !TOKEN_PATTERN.test(token)) {
      return null
    }

    const existing = await this.repository.findActiveByTokenHash(hashToken(token), this.now())

    if (existing === null) {
      return null
    }

    if (touch) {
      await this.repository.touch(existing.id)
    }

    return {
      expiresAt: new Date(existing.expiresAt),
      id: existing.id,
      tokenToSet: null,
    }
  }

  public async rotateForRecovery(
    currentSessionId: string | null,
    orderId: string,
  ): Promise<IGuestSessionContext> {
    const now = this.now()
    const token = randomBytes(TOKEN_BYTES).toString('base64url')
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS)
    const recovered = await this.repository.recover(
      currentSessionId,
      orderId,
      hashToken(token),
      expiresAt,
    )

    return {
      expiresAt: new Date(recovered.expiresAt),
      id: recovered.id,
      tokenToSet: token,
    }
  }

  public async revokeByToken(token: string | null): Promise<boolean> {
    const session = await this.resolve(token, false)

    if (session === null) {
      return false
    }

    await this.repository.revoke(session.id, this.now())
    return true
  }

  public async revokeCreatedSession(session: IGuestSessionContext): Promise<void> {
    if (session.tokenToSet !== null) {
      await this.repository.revoke(session.id, this.now())
    }
  }
}
