import { describe, expect, it, vi } from 'vitest'

import type { IAdminProfileRepository } from '../repositories/admin-profiles.repository.js'
import type { IAdminAccountProvider } from '../services/admin-auth.provider.js'
import { AdminProfileService } from '../services/admin-profile.service.js'

const PROFILE = {
  createdAt: '2026-08-01T12:00:00.000Z',
  email: 'admin@example.com',
  fullName: 'Administradora',
  id: 'bd62774b-7863-4fb4-a041-60d9003a4432',
  isActive: true,
  role: 'administrator' as const,
  updatedAt: '2026-08-03T12:00:00.000Z',
}

function createRepository(
  overrides: Partial<IAdminProfileRepository> = {},
): IAdminProfileRepository {
  return {
    findByUserId: vi.fn(),
    findDetailByUserId: vi.fn().mockResolvedValue(PROFILE),
    updateFullName: vi.fn().mockResolvedValue({ ...PROFILE, fullName: 'Margarita Admin' }),
    ...overrides,
  }
}

function createAccountProvider(
  overrides: Partial<IAdminAccountProvider> = {},
): IAdminAccountProvider {
  return {
    requestEmailChange: vi.fn().mockResolvedValue({
      email: 'nuevo@example.com',
      status: 'confirmation_pending',
    }),
    updatePassword: vi.fn().mockResolvedValue({ status: 'updated' }),
    ...overrides,
  }
}

describe('AdminProfileService', () => {
  it('returns the active administrative profile detail', async () => {
    const service = new AdminProfileService(createRepository(), createAccountProvider())
    await expect(service.get(PROFILE.id)).resolves.toEqual(PROFILE)
  })

  it('updates the full name with optimistic concurrency', async () => {
    const repository = createRepository()
    const service = new AdminProfileService(repository, createAccountProvider())

    await service.updateFullName(PROFILE.id, {
      expectedUpdatedAt: PROFILE.updatedAt,
      fullName: 'Margarita Admin',
    })

    expect(repository.updateFullName).toHaveBeenCalledWith(
      PROFILE.id,
      'Margarita Admin',
      PROFILE.updatedAt,
    )
  })

  it('rejects a stale full-name update', async () => {
    const service = new AdminProfileService(
      createRepository({ updateFullName: vi.fn().mockResolvedValue(null) }),
      createAccountProvider(),
    )

    await expect(service.updateFullName(PROFILE.id, {
      expectedUpdatedAt: PROFILE.updatedAt,
      fullName: 'Margarita Admin',
    })).rejects.toMatchObject({ code: 'ADMIN_PROFILE_UPDATE_CONFLICT', statusCode: 409 })
  })

  it('requests a confirmed email change through the authenticated provider', async () => {
    const provider = createAccountProvider()
    const service = new AdminProfileService(createRepository(), provider)

    await expect(service.requestEmailChange(
      PROFILE.id,
      { currentPassword: 'current-password', email: 'nuevo@example.com' },
      'access-token',
      'refresh-token',
    )).resolves.toMatchObject({ status: 'confirmation_pending' })
    expect(provider.requestEmailChange).toHaveBeenCalledWith(
      'access-token',
      'refresh-token',
      'current-password',
      'nuevo@example.com',
    )
  })

  it('maps an invalid current password without exposing provider details', async () => {
    const provider = createAccountProvider({
      requestEmailChange: vi.fn().mockResolvedValue({ status: 'invalid_current_password' }),
    })
    const service = new AdminProfileService(createRepository(), provider)

    await expect(service.requestEmailChange(
      PROFILE.id,
      { currentPassword: 'wrong', email: 'nuevo@example.com' },
      'access-token',
      'refresh-token',
    )).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD', statusCode: 401 })
  })

  it('changes the password and rejects reusing the current one', async () => {
    const provider = createAccountProvider()
    const service = new AdminProfileService(createRepository(), provider)

    await service.updatePassword(
      { currentPassword: 'current-password', newPassword: 'new-secure-password' },
      'access-token',
      'refresh-token',
    )
    expect(provider.updatePassword).toHaveBeenCalledOnce()

    await expect(service.updatePassword(
      { currentPassword: 'same-password', newPassword: 'same-password' },
      'access-token',
      'refresh-token',
    )).rejects.toMatchObject({ code: 'ADMIN_PASSWORD_UNCHANGED', statusCode: 400 })
  })
})
