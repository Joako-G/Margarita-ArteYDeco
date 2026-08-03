import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { IStorageRepository } from '../repositories/storage.repository.js'
import { StorageService } from '../services/storage.service.js'

describe('StorageService', () => {
  it('signs unique paths in one batch and reuses its cache', async () => {
    const createSignedUrls = vi.fn<IStorageRepository['createSignedUrls']>(
      (bucket, paths) =>
        Promise.resolve(
          new Map(
            paths.map((path) => [path, `https://storage.test/${bucket}/${path}?token=signed`]),
          ),
        ),
    )
    const service = new StorageService(
      { createSignedUrls, remove: vi.fn(), upload: vi.fn() },
      3_600,
      60,
      pino({ enabled: false }),
    )

    const first = await service.resolveSignedUrls('products', [
      'catalog/product.webp',
      'catalog/product.webp',
      'catalog/other.webp',
    ])
    const second = await service.resolveSignedUrls('products', ['catalog/product.webp'])

    expect(createSignedUrls).toHaveBeenCalledTimes(1)
    expect(createSignedUrls).toHaveBeenCalledWith(
      'products',
      ['catalog/product.webp', 'catalog/other.webp'],
      3_600,
    )
    expect(first.get('catalog/product.webp')).toContain('token=signed')
    expect(second.get('catalog/product.webp')).toBe(first.get('catalog/product.webp'))
  })

  it('returns null when an object cannot be signed', async () => {
    const service = new StorageService(
      {
        createSignedUrls: vi.fn().mockResolvedValue(new Map([['missing.webp', null]])),
        remove: vi.fn(),
        upload: vi.fn(),
      },
      3_600,
      60,
      pino({ enabled: false }),
    )

    const urls = await service.resolveSignedUrls('products', ['missing.webp'])

    expect(urls.get('missing.webp')).toBeNull()
  })
})
