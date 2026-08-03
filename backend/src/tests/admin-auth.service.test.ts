import { describe, expect, it, vi } from 'vitest'

import type { IAdminProfileRepository } from '../repositories/admin-profiles.repository.js'
import type { IAdminAuthProvider } from '../services/admin-auth.provider.js'
import { AdminAuthService } from '../services/admin-auth.service.js'

const TOKENS = {
  accessToken: 'access-token',
  expiresAt: new Date('2026-08-02T20:00:00.000Z'),
  refreshToken: 'refresh-token',
}

const PROFILE = {
  email: 'admin@example.com',
  fullName: 'Administradora',
  id: 'bd62774b-7863-4fb4-a041-60d9003a4432',
  isActive: true,
  role: 'administrator' as const,
}

function createAuthProvider(): IAdminAuthProvider {
  return {
    getUser: vi.fn(),
    refresh: vi.fn(),
    signIn: vi.fn().mockResolvedValue({
      identity: { tokens: TOKENS, userId: PROFILE.id },
      status: 'authenticated',
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
  }
}

function createProfileRepository(): IAdminProfileRepository {
  return { findByUserId: vi.fn().mockResolvedValue(PROFILE) }
}

describe('AdminAuthService', () => {
  it('returns the active database profile and Supabase session', async () => {
    const service = new AdminAuthService(createAuthProvider(), createProfileRepository())

    await expect(service.login({
      email: 'admin@example.com',
      password: 'valid-password',
    })).resolves.toEqual({ profile: PROFILE, tokens: TOKENS })
  })

  it('uses an indistinguishable error for invalid credentials', async () => {
    const provider = createAuthProvider()
    vi.mocked(provider.signIn).mockResolvedValue({ status: 'invalid_credentials' })
    const service = new AdminAuthService(provider, createProfileRepository())

    await expect(service.login({ email: 'unknown@example.com', password: 'wrong' }))
      .rejects.toMatchObject({ code: 'INVALID_ADMIN_CREDENTIALS', statusCode: 401 })
  })

  it('rejects and revokes a session without an administrator profile', async () => {
    const provider = createAuthProvider()
    const repository = createProfileRepository()
    vi.mocked(repository.findByUserId).mockResolvedValue(null)
    const service = new AdminAuthService(provider, repository)

    await expect(service.login({ email: 'user@example.com', password: 'valid-password' }))
      .rejects.toMatchObject({ code: 'INVALID_ADMIN_CREDENTIALS', statusCode: 401 })
    expect(provider.signOut).toHaveBeenCalledWith('access-token', 'refresh-token')
  })

  it('rejects and revokes an inactive administrator profile', async () => {
    const provider = createAuthProvider()
    const repository = createProfileRepository()
    vi.mocked(repository.findByUserId).mockResolvedValue({ ...PROFILE, isActive: false })
    const service = new AdminAuthService(provider, repository)

    await expect(service.login({ email: PROFILE.email, password: 'valid-password' }))
      .rejects.toMatchObject({ code: 'INVALID_ADMIN_CREDENTIALS', statusCode: 401 })
    expect(provider.signOut).toHaveBeenCalledOnce()
  })

  it('validates a current access token without rotating the session', async () => {
    const provider = createAuthProvider()
    vi.mocked(provider.getUser).mockResolvedValue({ status: 'authenticated', userId: PROFILE.id })
    const service = new AdminAuthService(provider, createProfileRepository())

    await expect(service.authenticate('access-token', 'refresh-token')).resolves.toEqual({
      profile: PROFILE,
      tokensToSet: null,
    })
    expect(provider.refresh).not.toHaveBeenCalled()
  })

  it('renews an invalid access token from its refresh credential', async () => {
    const provider = createAuthProvider()
    vi.mocked(provider.getUser).mockResolvedValue({ status: 'invalid_token' })
    vi.mocked(provider.refresh).mockResolvedValue({
      identity: { tokens: TOKENS, userId: PROFILE.id },
      status: 'authenticated',
    })
    const service = new AdminAuthService(provider, createProfileRepository())

    await expect(service.authenticate('expired-token', 'refresh-token')).resolves.toEqual({
      profile: PROFILE,
      tokensToSet: TOKENS,
    })
  })

  it('rejects a request without either session credential', async () => {
    const service = new AdminAuthService(createAuthProvider(), createProfileRepository())

    await expect(service.authenticate(null, null))
      .rejects.toMatchObject({ code: 'ADMIN_SESSION_REQUIRED', statusCode: 401 })
  })
})
