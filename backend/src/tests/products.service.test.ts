import { describe, expect, it } from 'vitest'

import type { IProductRepository } from '../repositories/products.repository.js'
import { ProductService } from '../services/products.service.js'
import type { IStorageUrlService } from '../types/storage.js'

describe('ProductService', () => {
  it('keeps the product available with a null image URL when Storage fails', async () => {
    const repository: IProductRepository = {
      findPublic: () => Promise.resolve([
        {
          catalogArea: 'art',
          categoryId: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
          createdAt: '2026-08-01T12:00:00.000Z',
          description: null,
          id: '9b66d7f7-f41c-485f-8a65-a3ac1ef8f3ee',
          imagePath: 'catalog/missing.webp',
          isFeatured: false,
          name: 'Producto sin imagen',
          price: 10_000,
          slug: 'producto-sin-imagen',
          stockQuantity: 2,
          updatedAt: '2026-08-01T12:00:00.000Z',
        },
      ]),
    }
    const storageService: IStorageUrlService = {
      resolveSignedUrls: () => Promise.resolve(new Map([['catalog/missing.webp', null]])),
    }
    const service = new ProductService(repository, storageService)

    const products = await service.listPublic({ limit: 100, sort: 'featured' })

    expect(products).toEqual([
      expect.objectContaining({
        description: '',
        imageUrl: null,
        name: 'Producto sin imagen',
      }),
    ])
  })
})
