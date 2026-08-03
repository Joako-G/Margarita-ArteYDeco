import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { IAdminCategoryRepository } from '../repositories/admin-categories.repository.js'
import { AdminCategoryService } from '../services/admin-categories.service.js'
import type { IAdminCategoryRecord } from '../types/admin-categories.js'
import type { IStorageMutationService } from '../types/storage.js'

const CATEGORY: IAdminCategoryRecord = {
  catalogArea: 'art',
  description: 'Materiales para pintar',
  displayOrder: 2,
  id: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
  imagePath: 'catalog/category/pinceles.webp',
  isActive: true,
  name: 'Pinceles',
  productCount: 4,
  slug: 'pinceles',
  updatedAt: '2026-08-03T12:00:00.000Z',
}

const FILTERS = {
  area: 'all' as const,
  page: 1,
  pageSize: 10,
  publication: 'all' as const,
  sort: 'orderAsc' as const,
}

function createRepository(
  overrides: Partial<IAdminCategoryRepository>,
): IAdminCategoryRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findPage: vi.fn(),
    softDelete: vi.fn(),
    update: vi.fn(),
    updateImage: vi.fn(),
    updatePublication: vi.fn(),
    ...overrides,
  }
}

function createStorageService(): IStorageMutationService {
  return {
    remove: vi.fn(),
    resolveSignedUrls: vi.fn().mockResolvedValue(new Map([
      [CATEGORY.imagePath, 'https://storage.test/category'],
    ])),
    upload: vi.fn(),
  }
}

const logger = pino({ enabled: false })

describe('AdminCategoryService', () => {
  it('maps a private paginated list without exposing storage paths', async () => {
    const repository = createRepository({
      findPage: vi.fn().mockResolvedValue({ items: [CATEGORY], totalItems: 12 }),
    })
    const service = new AdminCategoryService(repository, createStorageService(), logger)

    const result = await service.list(FILTERS)

    expect(result.items[0]).toMatchObject({
      imageUrl: 'https://storage.test/category',
      name: 'Pinceles',
      productCount: 4,
    })
    expect(result.pagination).toEqual({
      hasNextPage: true,
      hasPreviousPage: false,
      page: 1,
      pageSize: 10,
      totalItems: 12,
      totalPages: 2,
    })
    expect(JSON.stringify(result)).not.toContain(CATEGORY.imagePath)
  })

  it('creates an inactive category with a private pending image path', async () => {
    const repository = createRepository({
      create: vi.fn().mockImplementation(async (input) => ({
        ...CATEGORY,
        catalogArea: input.catalogArea,
        id: input.id,
        imagePath: input.imagePath,
        isActive: false,
        name: input.name,
        productCount: 0,
        slug: input.slug,
      })),
    })
    const service = new AdminCategoryService(repository, createStorageService(), logger)

    const result = await service.create({
      catalogArea: 'decoration',
      description: null,
      displayOrder: 1,
      name: 'Objetos pintados',
    }, 'bd62774b-7863-4fb4-a041-60d9003a4432')

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      catalogArea: 'decoration',
      imagePath: expect.stringMatching(/\/pending\.webp$/),
      slug: 'objetos-pintados',
    }))
    expect(result).toMatchObject({ imageUrl: null, isActive: false })
  })

  it('does not publish a category while its image is pending', async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue({
        ...CATEGORY,
        imagePath: `catalog/${CATEGORY.id}/pending.webp`,
        isActive: false,
      }),
    })
    const service = new AdminCategoryService(repository, createStorageService(), logger)

    await expect(service.setPublication(CATEGORY.id, {
      expectedUpdatedAt: CATEGORY.updatedAt,
      isActive: true,
    }, 'bd62774b-7863-4fb4-a041-60d9003a4432')).rejects.toMatchObject({
      code: 'CATEGORY_IMAGE_REQUIRED_FOR_PUBLICATION',
      statusCode: 409,
    })
    expect(repository.updatePublication).not.toHaveBeenCalled()
  })

  it('blocks area changes when products are associated', async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(CATEGORY) })
    const service = new AdminCategoryService(repository, createStorageService(), logger)

    await expect(service.update(CATEGORY.id, {
      catalogArea: 'decoration',
      description: CATEGORY.description,
      displayOrder: 0,
      expectedUpdatedAt: CATEGORY.updatedAt,
      isActive: true,
      name: CATEGORY.name,
    }, 'bd62774b-7863-4fb4-a041-60d9003a4432')).rejects.toMatchObject({
      code: 'CATEGORY_AREA_HAS_PRODUCTS',
      statusCode: 409,
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('replaces the image and removes the previous object only after persistence succeeds', async () => {
    const storage = createStorageService()
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(CATEGORY),
      updateImage: vi.fn().mockResolvedValue({
        ...CATEGORY,
        imagePath: 'catalog/category/new.webp',
        updatedAt: '2026-08-03T13:00:00.000Z',
      }),
    })
    const service = new AdminCategoryService(repository, storage, logger)

    await service.replaceImage(
      CATEGORY.id,
      CATEGORY.updatedAt,
      Buffer.from('image'),
      'image/webp',
      'webp',
      'bd62774b-7863-4fb4-a041-60d9003a4432',
    )

    expect(storage.upload).toHaveBeenCalledWith(
      'categories',
      expect.stringMatching(/\.webp$/),
      expect.any(Buffer),
      'image/webp',
    )
    expect(storage.remove).toHaveBeenCalledWith('categories', [CATEGORY.imagePath])
  })

  it('rejects soft delete while products remain associated', async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(CATEGORY) })
    const storage = createStorageService()
    const service = new AdminCategoryService(repository, storage, logger)

    await expect(service.softDelete(
      CATEGORY.id,
      CATEGORY.updatedAt,
      'bd62774b-7863-4fb4-a041-60d9003a4432',
    )).rejects.toMatchObject({ code: 'CATEGORY_HAS_PRODUCTS', statusCode: 409 })
    expect(repository.softDelete).not.toHaveBeenCalled()
    expect(storage.remove).not.toHaveBeenCalled()
  })
})
