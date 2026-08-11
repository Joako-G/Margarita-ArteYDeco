import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { IAdminCategoryRepository } from '../repositories/admin-categories.repository.js'
import { AdminCategoryService } from '../services/admin-categories.service.js'
import type { ICatalogImageService } from '../services/catalog-image.service.js'
import type {
  IAdminCategoryCreateInput,
  IAdminCategoryRecord,
} from '../types/admin-categories.js'
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
    findNextDisplayOrder: vi.fn(),
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

function createCatalogImageService(): ICatalogImageService {
  return {
    process: vi.fn().mockResolvedValue({
      file: Buffer.from('optimized-image'),
      height: 1_200,
      mimeType: 'image/webp',
      size: 15,
      width: 1_200,
    }),
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
      create: vi.fn().mockImplementation(async (
        input: IAdminCategoryCreateInput,
      ): Promise<IAdminCategoryRecord> => ({
        ...CATEGORY,
        catalogArea: input.catalogArea,
        id: input.id,
        imagePath: input.imagePath,
        isActive: false,
        name: input.name,
        productCount: 0,
        slug: input.slug,
      })),
      findNextDisplayOrder: vi.fn().mockResolvedValue(7),
    })
    const service = new AdminCategoryService(repository, createStorageService(), logger)

    const result = await service.create({
      catalogArea: 'decoration',
      description: null,
      name: 'Objetos pintados',
    }, 'bd62774b-7863-4fb4-a041-60d9003a4432')

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      catalogArea: 'decoration',
      displayOrder: 7,
      imagePath: expect.stringMatching(/\/pending\.webp$/),
      slug: 'objetos-pintados',
    }))
    expect(result).toMatchObject({ imageUrl: null, isActive: false })
  })

  it('starts category order at zero when the area has no previous categories', async () => {
    const repository = createRepository({
      create: vi.fn().mockImplementation(async (
        input: IAdminCategoryCreateInput,
      ): Promise<IAdminCategoryRecord> => ({
        ...CATEGORY,
        ...input,
        isActive: false,
        productCount: 0,
      })),
      findNextDisplayOrder: vi.fn().mockResolvedValue(0),
    })
    const service = new AdminCategoryService(repository, createStorageService(), logger)

    await service.create({
      catalogArea: 'art',
      description: null,
      name: 'Primera categoría',
    }, 'bd62774b-7863-4fb4-a041-60d9003a4432')

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ displayOrder: 0 }))
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
    const catalogImageService = createCatalogImageService()
    const service = new AdminCategoryService(repository, storage, logger, catalogImageService)

    await service.replaceImage(
      CATEGORY.id,
      CATEGORY.updatedAt,
      Buffer.from('image'),
      'image/webp',
      'bd62774b-7863-4fb4-a041-60d9003a4432',
    )

    expect(catalogImageService.process).toHaveBeenCalledWith(
      Buffer.from('image'),
      'image/webp',
      'category',
    )
    expect(storage.upload).toHaveBeenCalledWith(
      'categories',
      expect.stringMatching(/\.webp$/),
      expect.any(Buffer),
      'image/webp',
    )
    expect(storage.remove).toHaveBeenCalledWith('categories', [CATEGORY.imagePath])
    expect(vi.mocked(storage.upload).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(repository.updateImage).mock.invocationCallOrder[0] as number,
    )
    expect(vi.mocked(repository.updateImage).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(storage.remove).mock.invocationCallOrder[0] as number,
    )
  })

  it('removes the new object when persisting its path fails', async () => {
    const persistenceError = new Error('database unavailable')
    const storage = createStorageService()
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(CATEGORY),
      updateImage: vi.fn().mockRejectedValue(persistenceError),
    })
    const service = new AdminCategoryService(
      repository,
      storage,
      logger,
      createCatalogImageService(),
    )

    await expect(service.replaceImage(
      CATEGORY.id,
      CATEGORY.updatedAt,
      Buffer.from('image'),
      'image/png',
      'bd62774b-7863-4fb4-a041-60d9003a4432',
    )).rejects.toBe(persistenceError)

    const uploadedPath = vi.mocked(storage.upload).mock.calls[0]?.[1]
    expect(uploadedPath).toMatch(/\.webp$/)
    expect(storage.remove).toHaveBeenCalledWith('categories', [uploadedPath])
    expect(storage.remove).not.toHaveBeenCalledWith('categories', [CATEGORY.imagePath])
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
