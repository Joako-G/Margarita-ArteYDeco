import { describe, expect, it, vi } from 'vitest'

import type { IGuestSessionRepository } from '../repositories/guest-sessions.repository.js'
import { GuestSessionService } from '../services/guest-sessions.service.js'

const NOW = new Date('2026-08-02T15:00:00.000Z')
const SESSION_ID = '4bed49f2-d735-4f1e-ac56-85bdf5996f7b'

function createRepository(): IGuestSessionRepository {
  return {
    create: vi.fn().mockImplementation((_hash: string, expiresAt: Date) => ({
      expiresAt: expiresAt.toISOString(),
      id: SESSION_ID,
      revokedAt: null,
    })),
    findActiveByTokenHash: vi.fn().mockResolvedValue(null),
    recover: vi.fn().mockImplementation(
      (_currentId: string | null, _orderId: string, _hash: string, expiresAt: Date) => ({
        expiresAt: expiresAt.toISOString(),
        id: SESSION_ID,
        revokedAt: null,
      }),
    ),
    revoke: vi.fn().mockResolvedValue(undefined),
    touch: vi.fn().mockResolvedValue(undefined),
  }
}

describe('GuestSessionService', () => {
  it('creates a 256-bit opaque token and persists only its SHA-256 hash', async () => {
    const repository = createRepository()
    const service = new GuestSessionService(repository, () => NOW)

    const result = await service.getOrCreate(null)
    const createMock = vi.mocked(repository.create)
    const persistedHash = createMock.mock.calls[0]?.[0]

    expect(result.tokenToSet).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(persistedHash).toMatch(/^\\x[0-9a-f]{64}$/)
    expect(persistedHash).not.toContain(result.tokenToSet ?? '')
    expect(result.expiresAt.toISOString()).toBe('2026-09-01T14:55:00.000Z')
  })

  it('reuses an active session without rotating its token', async () => {
    const repository = createRepository()
    vi.mocked(repository.findActiveByTokenHash).mockResolvedValue({
      expiresAt: '2026-08-20T15:00:00.000Z',
      id: SESSION_ID,
      revokedAt: null,
    })
    const service = new GuestSessionService(repository, () => NOW)

    const result = await service.getOrCreate('A'.repeat(43))

    expect(result).toEqual({
      expiresAt: new Date('2026-08-20T15:00:00.000Z'),
      id: SESSION_ID,
      tokenToSet: null,
    })
    expect(repository.create).not.toHaveBeenCalled()
    expect(repository.touch).toHaveBeenCalledWith(SESSION_ID)
  })

  it('rejects malformed credentials without querying the repository', async () => {
    const repository = createRepository()
    const service = new GuestSessionService(repository, () => NOW)

    await expect(service.resolve('not-a-valid-token')).resolves.toBeNull()
    expect(repository.findActiveByTokenHash).not.toHaveBeenCalled()
    expect(repository.touch).not.toHaveBeenCalled()
  })

  it('rotates a recovery credential and persists only its hash', async () => {
    const repository = createRepository()
    const service = new GuestSessionService(repository, () => NOW)

    const result = await service.rotateForRecovery(SESSION_ID, SESSION_ID)
    const recoverCall = vi.mocked(repository.recover).mock.calls[0]

    expect(result.tokenToSet).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(recoverCall?.[0]).toBe(SESSION_ID)
    expect(recoverCall?.[1]).toBe(SESSION_ID)
    expect(recoverCall?.[2]).toMatch(/^\\x[0-9a-f]{64}$/)
    expect(recoverCall?.[2]).not.toContain(result.tokenToSet ?? '')
  })

  it('treats revocation of an invalid credential as an idempotent no-op', async () => {
    const repository = createRepository()
    const service = new GuestSessionService(repository, () => NOW)

    await expect(service.revokeByToken(null)).resolves.toBe(false)
    expect(repository.revoke).not.toHaveBeenCalled()
  })

  it('revokes only a session that was created for the failed request', async () => {
    const repository = createRepository()
    const service = new GuestSessionService(repository, () => NOW)

    await service.revokeCreatedSession({ expiresAt: NOW, id: SESSION_ID, tokenToSet: null })
    expect(repository.revoke).not.toHaveBeenCalled()

    await service.revokeCreatedSession({ expiresAt: NOW, id: SESSION_ID, tokenToSet: 'token' })
    expect(repository.revoke).toHaveBeenCalledWith(SESSION_ID, NOW)
  })
})
