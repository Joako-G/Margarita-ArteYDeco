import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { IAdminSettingsRepository } from '../repositories/admin-settings.repository.js'
import { AdminSettingsService } from '../services/admin-settings.service.js'
import type { IAdminSettingsRecord } from '../types/admin-settings.js'
import type { IStorageMutationService } from '../types/storage.js'

const SETTINGS: IAdminSettingsRecord = {
  address: 'Av. Siempre Viva 123',
  bankName: 'Banco Nación',
  businessHours: 'Lunes a viernes de 9 a 18',
  businessName: 'Margaritas Arte & Deco',
  facebook: 'https://facebook.com/margaritas',
  id: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
  instagram: 'https://instagram.com/margaritas',
  logoPath: 'brand/current.webp',
  lowStockThreshold: 5,
  mapsUrl: 'https://maps.google.com/?q=local',
  tiktok: 'https://tiktok.com/@margaritas',
  transferAlias: 'MARGARITAS.ARTE',
  transferCbu: '1234567890123456789012',
  transferDiscount: 10,
  updatedAt: '2026-08-03T12:00:00.000Z',
  whatsapp: '5491155551234',
}
const ACTOR_ID = 'bd62774b-7863-4fb4-a041-60d9003a4432'

function createRepository(
  overrides: Partial<IAdminSettingsRepository> = {},
): IAdminSettingsRepository {
  return {
    findOne: vi.fn().mockResolvedValue(SETTINGS),
    update: vi.fn().mockResolvedValue({ ...SETTINGS, businessName: 'Margaritas' }),
    updateLogo: vi.fn().mockResolvedValue({ ...SETTINGS, logoPath: 'brand/new.webp' }),
    ...overrides,
  }
}

function createStorage(overrides: Partial<IStorageMutationService> = {}): IStorageMutationService {
  return {
    remove: vi.fn(),
    resolveSignedUrls: vi.fn().mockResolvedValue(new Map([
      ['brand/current.webp', 'https://storage.test/current'],
      ['brand/new.webp', 'https://storage.test/new'],
    ])),
    upload: vi.fn(),
    ...overrides,
  }
}

const logger = pino({ enabled: false })

describe('AdminSettingsService', () => {
  it('returns the complete private contract without exposing the storage path', async () => {
    const service = new AdminSettingsService(createRepository(), createStorage(), logger)
    const result = await service.get()

    expect(result).toMatchObject({ bankName: 'Banco Nación', logoUrl: 'https://storage.test/current' })
    expect(JSON.stringify(result)).not.toContain('logoPath')
  })

  it('updates operational settings with optimistic concurrency', async () => {
    const repository = createRepository()
    const service = new AdminSettingsService(repository, createStorage(), logger)
    const input = {
      ...SETTINGS,
      expectedUpdatedAt: SETTINGS.updatedAt,
      facebook: null,
      instagram: null,
    }

    await service.update(input, ACTOR_ID)

    expect(repository.update).toHaveBeenCalledWith(SETTINGS.id, input)
  })

  it('rejects stale settings before persistence', async () => {
    const repository = createRepository()
    const service = new AdminSettingsService(repository, createStorage(), logger)

    await expect(service.update({
      ...SETTINGS,
      expectedUpdatedAt: '2026-08-03T11:00:00.000Z',
    }, ACTOR_ID)).rejects.toMatchObject({ code: 'SETTINGS_UPDATE_CONFLICT', statusCode: 409 })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('uploads a new private logo and removes the previous object after persistence', async () => {
    const storage = createStorage()
    const service = new AdminSettingsService(createRepository(), storage, logger)

    await service.replaceLogo(
      SETTINGS.updatedAt,
      Buffer.from('image'),
      'image/webp',
      'webp',
      ACTOR_ID,
    )

    expect(storage.upload).toHaveBeenCalledWith(
      'settings',
      expect.stringMatching(/^brand\/[0-9a-f-]+\.webp$/),
      expect.any(Buffer),
      'image/webp',
    )
    expect(storage.remove).toHaveBeenCalledWith('settings', [SETTINGS.logoPath])
  })

  it('cleans the uploaded logo when persistence detects a conflict', async () => {
    const repository = createRepository({ updateLogo: vi.fn().mockResolvedValue(null) })
    const storage = createStorage()
    const service = new AdminSettingsService(repository, storage, logger)

    await expect(service.replaceLogo(
      SETTINGS.updatedAt,
      Buffer.from('image'),
      'image/png',
      'png',
      ACTOR_ID,
    )).rejects.toMatchObject({ code: 'SETTINGS_UPDATE_CONFLICT' })
    expect(storage.remove).toHaveBeenCalledWith(
      'settings',
      [expect.stringMatching(/^brand\/[0-9a-f-]+\.png$/)],
    )
  })

  it('removes the configured logo and returns the official fallback state', async () => {
    const repository = createRepository({
      updateLogo: vi.fn().mockResolvedValue({ ...SETTINGS, logoPath: null }),
    })
    const storage = createStorage()
    const service = new AdminSettingsService(repository, storage, logger)

    const result = await service.removeLogo(SETTINGS.updatedAt, ACTOR_ID)

    expect(repository.updateLogo).toHaveBeenCalledWith(SETTINGS.id, null, SETTINGS.updatedAt)
    expect(storage.remove).toHaveBeenCalledWith('settings', [SETTINGS.logoPath])
    expect(result.logoUrl).toBeNull()
  })

  it('maps storage upload failures to an available safe error', async () => {
    const storage = createStorage({ upload: vi.fn().mockRejectedValue(new Error('private')) })
    const service = new AdminSettingsService(createRepository(), storage, logger)

    await expect(service.replaceLogo(
      SETTINGS.updatedAt,
      Buffer.from('image'),
      'image/jpeg',
      'jpg',
      ACTOR_ID,
    )).rejects.toMatchObject({ code: 'SETTINGS_LOGO_STORAGE_UNAVAILABLE', statusCode: 503 })
  })
})
