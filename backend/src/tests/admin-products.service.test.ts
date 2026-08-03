import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { IAdminProductRepository } from '../repositories/admin-products.repository.js'
import { AdminProductService } from '../services/admin-products.service.js'
import type { IStorageMutationService } from '../types/storage.js'

const FILTERS = {
  page: 1,
  pageSize: 10,
  publication: 'all' as const,
  sort: 'newest' as const,
  stock: 'all' as const,
}

function createRepository(
  overrides: Partial<IAdminProductRepository>,
): IAdminProductRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findCategoryById: vi.fn(),
    findCategoryOptions: vi.fn(),
    findPage: vi.fn(),
    softDelete: vi.fn(),
    update: vi.fn(),
    updateImage: vi.fn(),
    updateState: vi.fn(),
    ...overrides,
  }
}

function createStorageService(
  resolveSignedUrls: IStorageMutationService['resolveSignedUrls'],
): IStorageMutationService {
  return {
    remove: vi.fn(),
    resolveSignedUrls,
    upload: vi.fn(),
  }
}

const logger = pino({ enabled: false })

describe('AdminProductService', () => {
  it('maps images, stock status and pagination without exposing storage paths', async () => {
    const repository = createRepository({
      findPage: vi.fn().mockResolvedValue({
        items: [
          {
            catalogArea: 'art',
            categoryId: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
            categoryName: 'Pinceles',
            id: '9b66d7f7-f41c-485f-8a65-a3ac1ef8f3ee',
            imagePath: 'catalog/pincel.webp',
            isActive: true,
            isFeatured: true,
            name: 'Pincel redondo',
            price: 4_500,
            slug: 'pincel-redondo',
            stockQuantity: 2,
            updatedAt: '2026-08-03T12:00:00.000Z',
          },
          {
            catalogArea: 'decoration',
            categoryId: '6ad24395-8ab9-4a3b-993e-b2562bca1204',
            categoryName: 'Cuadros',
            id: 'e5fdde36-86bc-4a29-9e71-26c35faef56d',
            imagePath: 'catalog/cuadro.webp',
            isActive: false,
            isFeatured: false,
            name: 'Cuadro floral',
            price: 18_000,
            slug: 'cuadro-floral',
            stockQuantity: 0,
            updatedAt: '2026-08-02T10:00:00.000Z',
          },
        ],
        lowStockThreshold: 3,
        totalItems: 12,
      }),
    })
    const storageService = createStorageService(vi.fn().mockResolvedValue(new Map([
        ['catalog/pincel.webp', 'https://storage.test/pincel'],
        ['catalog/cuadro.webp', null],
      ])))
    const service = new AdminProductService(repository, storageService, logger)

    const result = await service.list(FILTERS)

    expect(result.items).toEqual([
      expect.objectContaining({
        imageUrl: 'https://storage.test/pincel',
        stockStatus: 'lowStock',
      }),
      expect.objectContaining({
        imageUrl: null,
        stockStatus: 'outOfStock',
      }),
    ])
    expect(result.pagination).toEqual({
      hasNextPage: true,
      hasPreviousPage: false,
      page: 1,
      pageSize: 10,
      totalItems: 12,
      totalPages: 2,
    })
    expect(JSON.stringify(result)).not.toContain('imagePath')
  })

  it('returns an empty first page without inventing additional pages', async () => {
    const repository = createRepository({
      findPage: vi.fn().mockResolvedValue({
        items: [],
        lowStockThreshold: 3,
        totalItems: 0,
      }),
    })
    const storageService = createStorageService(vi.fn().mockResolvedValue(new Map()))

    await expect(new AdminProductService(repository, storageService, logger).list(FILTERS))
      .resolves.toEqual({
        items: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        },
      })
  })

  it('creates products without requiring an image and derives a normalized slug', async () => {
    const createdProduct = {
      catalogArea: 'art' as const,
      categoryId: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
      categoryName: 'Pinceles',
      description: null,
      id: '9b66d7f7-f41c-485f-8a65-a3ac1ef8f3ee',
      imagePath: null,
      isActive: true,
      isFeatured: false,
      name: 'Pincel Ángulo Nº 2',
      price: 4_500,
      slug: 'pincel-angulo-n-2',
      stockQuantity: 3,
      updatedAt: '2026-08-03T12:00:00.000Z',
    }
    const repository = createRepository({
      create: vi.fn().mockResolvedValue(createdProduct),
      findCategoryById: vi.fn().mockResolvedValue({
        catalogArea: 'art',
        id: createdProduct.categoryId,
        isActive: true,
        name: createdProduct.categoryName,
      }),
    })
    const storageService = createStorageService(vi.fn().mockResolvedValue(new Map()))
    const service = new AdminProductService(repository, storageService, logger)

    const result = await service.create({
      categoryId: createdProduct.categoryId,
      description: null,
      isActive: true,
      isFeatured: false,
      name: createdProduct.name,
      price: createdProduct.price,
      stockQuantity: createdProduct.stockQuantity,
    }, 'bd62774b-7863-4fb4-a041-60d9003a4432')

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      slug: 'pincel-angulo-n-2',
    }))
    expect(result.imageUrl).toBeNull()
    expect(storageService.resolveSignedUrls).not.toHaveBeenCalled()
  })

  it('publishes a product without changing its stock and validates its category first', async () => {
    const currentProduct = {
      catalogArea: 'art' as const,
      categoryId: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
      categoryName: 'Pinceles',
      description: null,
      id: '9b66d7f7-f41c-485f-8a65-a3ac1ef8f3ee',
      imagePath: null,
      isActive: false,
      isFeatured: false,
      name: 'Pincel redondo',
      price: 4_500,
      slug: 'pincel-redondo',
      stockQuantity: 7,
      updatedAt: '2026-08-03T12:00:00.000Z',
    }
    const publishedProduct = {
      ...currentProduct,
      isActive: true,
      updatedAt: '2026-08-03T12:01:00.000Z',
    }
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(currentProduct),
      findCategoryById: vi.fn().mockResolvedValue({
        catalogArea: 'art',
        id: currentProduct.categoryId,
        isActive: true,
        name: currentProduct.categoryName,
      }),
      updateState: vi.fn().mockResolvedValue(publishedProduct),
    })
    const storageService = createStorageService(vi.fn().mockResolvedValue(new Map()))
    const service = new AdminProductService(repository, storageService, logger)

    await expect(service.setPublication(currentProduct.id, {
      expectedUpdatedAt: currentProduct.updatedAt,
      isActive: true,
    }, 'bd62774b-7863-4fb4-a041-60d9003a4432')).resolves.toEqual(
      expect.objectContaining({ isActive: true, stockQuantity: 7 }),
    )

    expect(repository.findCategoryById).toHaveBeenCalledWith(currentProduct.categoryId)
    expect(repository.updateState).toHaveBeenCalledWith(currentProduct.id, {
      expectedUpdatedAt: currentProduct.updatedAt,
      isActive: true,
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('does not publish a product whose category is inactive', async () => {
    const currentProduct = {
      catalogArea: 'art' as const,
      categoryId: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
      categoryName: 'Pinceles',
      description: null,
      id: '9b66d7f7-f41c-485f-8a65-a3ac1ef8f3ee',
      imagePath: null,
      isActive: false,
      isFeatured: false,
      name: 'Pincel redondo',
      price: 4_500,
      slug: 'pincel-redondo',
      stockQuantity: 7,
      updatedAt: '2026-08-03T12:00:00.000Z',
    }
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(currentProduct),
      findCategoryById: vi.fn().mockResolvedValue({
        catalogArea: 'art',
        id: currentProduct.categoryId,
        isActive: false,
        name: currentProduct.categoryName,
      }),
    })
    const service = new AdminProductService(
      repository,
      createStorageService(vi.fn().mockResolvedValue(new Map())),
      logger,
    )

    await expect(service.setPublication(currentProduct.id, {
      expectedUpdatedAt: currentProduct.updatedAt,
      isActive: true,
    }, 'bd62774b-7863-4fb4-a041-60d9003a4432')).rejects.toMatchObject({
      code: 'PRODUCT_CATEGORY_INACTIVE',
      statusCode: 409,
    })
    expect(repository.updateState).not.toHaveBeenCalled()
  })

  it('updates the featured state with optimistic concurrency', async () => {
    const currentProduct = {
      catalogArea: 'decoration' as const,
      categoryId: '6ad24395-8ab9-4a3b-993e-b2562bca1204',
      categoryName: 'Cuadros',
      description: null,
      id: 'e5fdde36-86bc-4a29-9e71-26c35faef56d',
      imagePath: 'catalog/cuadro.webp',
      isActive: true,
      isFeatured: false,
      name: 'Cuadro floral',
      price: 18_000,
      slug: 'cuadro-floral',
      stockQuantity: 2,
      updatedAt: '2026-08-03T12:00:00.000Z',
    }
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(currentProduct),
      updateState: vi.fn().mockResolvedValue({ ...currentProduct, isFeatured: true }),
    })
    const storageService = createStorageService(vi.fn().mockResolvedValue(new Map([
      [currentProduct.imagePath, 'https://storage.test/cuadro'],
    ])))

    await expect(new AdminProductService(repository, storageService, logger).setFeatured(
      currentProduct.id,
      { expectedUpdatedAt: currentProduct.updatedAt, isFeatured: true },
      'bd62774b-7863-4fb4-a041-60d9003a4432',
    )).resolves.toEqual(expect.objectContaining({ isFeatured: true }))
    expect(repository.updateState).toHaveBeenCalledWith(currentProduct.id, {
      expectedUpdatedAt: currentProduct.updatedAt,
      isFeatured: true,
    })
  })

  it('soft deletes without touching stock or removing its image', async () => {
    const currentProduct = {
      catalogArea: 'decoration' as const,
      categoryId: '6ad24395-8ab9-4a3b-993e-b2562bca1204',
      categoryName: 'Cuadros',
      description: null,
      id: 'e5fdde36-86bc-4a29-9e71-26c35faef56d',
      imagePath: 'catalog/cuadro.webp',
      isActive: true,
      isFeatured: true,
      name: 'Cuadro floral',
      price: 18_000,
      slug: 'cuadro-floral',
      stockQuantity: 2,
      updatedAt: '2026-08-03T12:00:00.000Z',
    }
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(currentProduct),
      softDelete: vi.fn().mockResolvedValue(true),
    })
    const storageService = createStorageService(vi.fn().mockResolvedValue(new Map()))

    await expect(new AdminProductService(repository, storageService, logger).softDelete(
      currentProduct.id,
      currentProduct.updatedAt,
      'bd62774b-7863-4fb4-a041-60d9003a4432',
    )).resolves.toBeUndefined()
    expect(repository.softDelete).toHaveBeenCalledWith(
      currentProduct.id,
      currentProduct.updatedAt,
    )
    expect(repository.update).not.toHaveBeenCalled()
    expect(storageService.remove).not.toHaveBeenCalled()
  })

  it('reports a concurrent change when soft delete no longer matches updatedAt', async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue({
        catalogArea: 'art',
        categoryId: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
        categoryName: 'Pinceles',
        description: null,
        id: '9b66d7f7-f41c-485f-8a65-a3ac1ef8f3ee',
        imagePath: null,
        isActive: true,
        isFeatured: false,
        name: 'Pincel redondo',
        price: 4_500,
        slug: 'pincel-redondo',
        stockQuantity: 7,
        updatedAt: '2026-08-03T12:00:00.000Z',
      }),
      softDelete: vi.fn().mockResolvedValue(false),
    })
    const service = new AdminProductService(
      repository,
      createStorageService(vi.fn().mockResolvedValue(new Map())),
      logger,
    )

    await expect(service.softDelete(
      '9b66d7f7-f41c-485f-8a65-a3ac1ef8f3ee',
      '2026-08-03T12:00:00.000Z',
      'bd62774b-7863-4fb4-a041-60d9003a4432',
    )).rejects.toMatchObject({ code: 'PRODUCT_UPDATE_CONFLICT', statusCode: 409 })
  })
})
