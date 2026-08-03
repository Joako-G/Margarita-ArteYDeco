import { randomUUID } from 'node:crypto'

import type { Logger } from 'pino'

import {
  CategoryAreaConflictError,
  CategorySlugConflictError,
  type IAdminCategoryRepository,
} from '../repositories/admin-categories.repository.js'
import type {
  AdminCategoryCreateRequestType,
  AdminCategoryUpdateRequestType,
  IAdminCategoryDetailDto,
  IAdminCategoryFilters,
  IAdminCategoryListDto,
  IAdminCategoryPublicationRequest,
  IAdminCategoryRecord,
} from '../types/admin-categories.js'
import type { IStorageMutationService } from '../types/storage.js'
import { AppError } from '../utils/app-error.js'
import type { CategoryImageMimeType } from '../utils/product-image.js'
import { createSlug } from '../utils/slug.js'

export interface IAdminCategoryService {
  create(
    input: AdminCategoryCreateRequestType,
    actorProfileId: string,
  ): Promise<IAdminCategoryDetailDto>
  getById(categoryId: string): Promise<IAdminCategoryDetailDto>
  list(filters: IAdminCategoryFilters): Promise<IAdminCategoryListDto>
  replaceImage(
    categoryId: string,
    expectedUpdatedAt: string,
    file: Buffer,
    mimeType: CategoryImageMimeType,
    extension: string,
    actorProfileId: string,
  ): Promise<IAdminCategoryDetailDto>
  setPublication(
    categoryId: string,
    input: IAdminCategoryPublicationRequest,
    actorProfileId: string,
  ): Promise<IAdminCategoryDetailDto>
  softDelete(categoryId: string, expectedUpdatedAt: string, actorProfileId: string): Promise<void>
  update(
    categoryId: string,
    input: AdminCategoryUpdateRequestType,
    actorProfileId: string,
  ): Promise<IAdminCategoryDetailDto>
}

export class AdminCategoryService implements IAdminCategoryService {
  public constructor(
    private readonly repository: IAdminCategoryRepository,
    private readonly storageService: IStorageMutationService,
    private readonly logger: Logger,
  ) {}

  public async list(filters: IAdminCategoryFilters): Promise<IAdminCategoryListDto> {
    const page = await this.repository.findPage(filters)
    const imagePaths = page.items
      .filter((category) => !this.isPendingImage(category.imagePath))
      .map((category) => category.imagePath)
    const imageUrls = await this.storageService.resolveSignedUrls('categories', imagePaths)
    const totalPages = page.totalItems === 0 ? 0 : Math.ceil(page.totalItems / filters.pageSize)

    return {
      items: page.items.map((category) => this.mapCategory(category, imageUrls)),
      pagination: {
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1 && totalPages > 0,
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems: page.totalItems,
        totalPages,
      },
    }
  }

  public async getById(categoryId: string): Promise<IAdminCategoryDetailDto> {
    return this.toDetail(await this.requireCategory(categoryId))
  }

  public async create(
    input: AdminCategoryCreateRequestType,
    actorProfileId: string,
  ): Promise<IAdminCategoryDetailDto> {
    const id = randomUUID()
    const slug = this.requireSlug(input.name)

    try {
      const category = await this.repository.create({
        ...input,
        id,
        imagePath: `catalog/${id}/pending.webp`,
        slug,
      })
      this.audit('category_created', category.id, actorProfileId, {
        catalogArea: category.catalogArea,
        displayOrder: category.displayOrder,
      })
      return this.toDetail(category)
    } catch (error) {
      this.throwDomainConflict(error)
      throw error
    }
  }

  public async update(
    categoryId: string,
    input: AdminCategoryUpdateRequestType,
    actorProfileId: string,
  ): Promise<IAdminCategoryDetailDto> {
    const current = await this.requireCategory(categoryId)
    this.validateAreaChange(current, input.catalogArea)
    this.validatePublication(current.imagePath, input.isActive)

    try {
      const category = await this.repository.update(categoryId, {
        ...input,
        slug: this.requireSlug(input.name),
      })
      if (category === null) throw this.concurrentUpdateError()

      this.audit('category_updated', category.id, actorProfileId, {
        catalogArea: category.catalogArea,
        displayOrder: category.displayOrder,
      })
      return this.toDetail(category)
    } catch (error) {
      this.throwDomainConflict(error)
      throw error
    }
  }

  public async replaceImage(
    categoryId: string,
    expectedUpdatedAt: string,
    file: Buffer,
    mimeType: CategoryImageMimeType,
    extension: string,
    actorProfileId: string,
  ): Promise<IAdminCategoryDetailDto> {
    const current = await this.requireCategory(categoryId)
    const newPath = `catalog/${categoryId}/${randomUUID()}.${extension}`

    try {
      await this.storageService.upload('categories', newPath, file, mimeType)
    } catch (error) {
      this.logger.error({ categoryId, error }, 'No fue posible subir la imagen de la categoría')
      throw new AppError(503, 'No pudimos guardar la imagen', 'CATEGORY_IMAGE_STORAGE_UNAVAILABLE')
    }

    let category: IAdminCategoryRecord | null

    try {
      category = await this.repository.updateImage(categoryId, newPath, expectedUpdatedAt)
    } catch (error) {
      await this.removeStorageImageBestEffort(newPath, categoryId)
      throw error
    }

    if (category === null) {
      await this.removeStorageImageBestEffort(newPath, categoryId)
      throw this.concurrentUpdateError()
    }

    if (!this.isPendingImage(current.imagePath)) {
      await this.removeStorageImageBestEffort(current.imagePath, categoryId)
    }

    this.audit('category_image_replaced', category.id, actorProfileId, {})
    return this.toDetail(category)
  }

  public async setPublication(
    categoryId: string,
    input: IAdminCategoryPublicationRequest,
    actorProfileId: string,
  ): Promise<IAdminCategoryDetailDto> {
    const current = await this.requireCategory(categoryId)
    if (current.isActive === input.isActive) return this.toDetail(current)
    this.validatePublication(current.imagePath, input.isActive)

    const category = await this.repository.updatePublication(
      categoryId,
      input.isActive,
      input.expectedUpdatedAt,
    )
    if (category === null) throw this.concurrentUpdateError()

    this.audit(
      input.isActive ? 'category_activated' : 'category_deactivated',
      category.id,
      actorProfileId,
      { previousValue: current.isActive, value: input.isActive },
    )
    return this.toDetail(category)
  }

  public async softDelete(
    categoryId: string,
    expectedUpdatedAt: string,
    actorProfileId: string,
  ): Promise<void> {
    const current = await this.requireCategory(categoryId)

    if (current.productCount > 0) {
      throw new AppError(
        409,
        'La categoría tiene productos asociados y no puede eliminarse',
        'CATEGORY_HAS_PRODUCTS',
        { productCount: current.productCount },
      )
    }

    const wasDeleted = await this.repository.softDelete(categoryId, expectedUpdatedAt)
    if (!wasDeleted) throw this.concurrentUpdateError()

    this.audit('category_soft_deleted', categoryId, actorProfileId, {
      imagePreserved: !this.isPendingImage(current.imagePath),
    })
  }

  private async toDetail(category: IAdminCategoryRecord): Promise<IAdminCategoryDetailDto> {
    if (this.isPendingImage(category.imagePath)) {
      return this.mapCategory(category, new Map())
    }

    const imageUrls = await this.storageService.resolveSignedUrls(
      'categories',
      [category.imagePath],
    )
    return this.mapCategory(category, imageUrls)
  }

  private mapCategory(
    category: IAdminCategoryRecord,
    imageUrls: ReadonlyMap<string, string | null>,
  ): IAdminCategoryDetailDto {
    return {
      catalogArea: category.catalogArea,
      description: category.description ?? '',
      displayOrder: category.displayOrder,
      id: category.id,
      imageUrl: this.isPendingImage(category.imagePath)
        ? null
        : imageUrls.get(category.imagePath) ?? null,
      isActive: category.isActive,
      name: category.name,
      productCount: category.productCount,
      slug: category.slug,
      updatedAt: category.updatedAt,
    }
  }

  private async requireCategory(categoryId: string): Promise<IAdminCategoryRecord> {
    const category = await this.repository.findById(categoryId)
    if (category === null) {
      throw new AppError(404, 'Categoría no encontrada', 'ADMIN_CATEGORY_NOT_FOUND')
    }
    return category
  }

  private validateAreaChange(category: IAdminCategoryRecord, catalogArea: string): void {
    if (category.catalogArea !== catalogArea && category.productCount > 0) {
      throw new AppError(
        409,
        'No podés cambiar el área de una categoría con productos asociados',
        'CATEGORY_AREA_HAS_PRODUCTS',
        { productCount: category.productCount },
      )
    }
  }

  private validatePublication(imagePath: string, isActive: boolean): void {
    if (isActive && this.isPendingImage(imagePath)) {
      throw new AppError(
        409,
        'Cargá una imagen antes de activar la categoría',
        'CATEGORY_IMAGE_REQUIRED_FOR_PUBLICATION',
      )
    }
  }

  private isPendingImage(path: string): boolean {
    return path.endsWith('/pending.webp')
  }

  private requireSlug(name: string): string {
    const slug = createSlug(name)
    if (slug === '') {
      throw new AppError(400, 'El nombre no genera una URL válida', 'CATEGORY_SLUG_INVALID')
    }
    return slug
  }

  private throwDomainConflict(error: unknown): void {
    if (error instanceof CategorySlugConflictError) {
      throw new AppError(409, 'Ya existe una categoría con ese nombre', 'CATEGORY_SLUG_CONFLICT')
    }
    if (error instanceof CategoryAreaConflictError) {
      throw new AppError(
        409,
        'No podés cambiar el área de una categoría con productos asociados',
        'CATEGORY_AREA_HAS_PRODUCTS',
      )
    }
  }

  private concurrentUpdateError(): AppError {
    return new AppError(
      409,
      'La categoría cambió mientras la editabas. Recargá la página e intentá nuevamente',
      'CATEGORY_UPDATE_CONFLICT',
    )
  }

  private async removeStorageImageBestEffort(path: string, categoryId: string): Promise<void> {
    try {
      await this.storageService.remove('categories', [path])
    } catch (error) {
      this.logger.warn({ categoryId, error, path }, 'No fue posible retirar una imagen anterior')
    }
  }

  private audit(
    action: string,
    entityId: string,
    actorProfileId: string,
    metadata: Readonly<Record<string, boolean | number | string>>,
  ): void {
    this.logger.info(
      { action, actorProfileId, entityId, entityType: 'category', metadata },
      'Auditoría administrativa',
    )
  }
}
