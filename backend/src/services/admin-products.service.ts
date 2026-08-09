import { randomUUID } from 'node:crypto'

import type { Logger } from 'pino'

import {
  ProductSlugConflictError,
  type IAdminProductRepository,
} from '../repositories/admin-products.repository.js'
import type {
  AdminProductCreateRequestType,
  IAdminProductFeaturedRequest,
  IAdminProductPublicationRequest,
  AdminProductUpdateRequestType,
  IAdminProductCategoryOption,
  IAdminProductDetailDto,
  IAdminProductFilters,
  IAdminProductListDto,
  IAdminProductRecord,
} from '../types/admin-products.js'
import type { IStorageMutationService } from '../types/storage.js'
import { AppError } from '../utils/app-error.js'
import type { ProductImageMimeType } from '../utils/product-image.js'
import { createSlug } from '../utils/slug.js'
import { CatalogImageService, type ICatalogImageService } from './catalog-image.service.js'

export interface IAdminProductService {
  create(input: AdminProductCreateRequestType, actorProfileId: string): Promise<IAdminProductDetailDto>
  getById(productId: string): Promise<IAdminProductDetailDto>
  getCategoryOptions(): Promise<readonly IAdminProductCategoryOption[]>
  list(filters: IAdminProductFilters): Promise<IAdminProductListDto>
  setFeatured(
    productId: string,
    input: IAdminProductFeaturedRequest,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto>
  setPublication(
    productId: string,
    input: IAdminProductPublicationRequest,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto>
  softDelete(productId: string, expectedUpdatedAt: string, actorProfileId: string): Promise<void>
  removeImage(
    productId: string,
    expectedUpdatedAt: string,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto>
  replaceImage(
    productId: string,
    expectedUpdatedAt: string,
    file: Buffer,
    mimeType: ProductImageMimeType,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto>
  update(
    productId: string,
    input: AdminProductUpdateRequestType,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto>
}

function getStockStatus(
  stockQuantity: number,
  lowStockThreshold: number,
): IAdminProductListDto['items'][number]['stockStatus'] {
  if (stockQuantity === 0) return 'outOfStock'
  return stockQuantity <= lowStockThreshold ? 'lowStock' : 'inStock'
}

export class AdminProductService implements IAdminProductService {
  public constructor(
    private readonly repository: IAdminProductRepository,
    private readonly storageService: IStorageMutationService,
    private readonly logger: Logger,
    private readonly catalogImageService: ICatalogImageService = new CatalogImageService(),
  ) {}

  public async list(filters: IAdminProductFilters): Promise<IAdminProductListDto> {
    const page = await this.repository.findPage(filters)
    const imageUrls = await this.storageService.resolveSignedUrls(
      'products',
      page.items.flatMap((product) => product.imagePath === null ? [] : [product.imagePath]),
    )
    const totalPages = Math.ceil(page.totalItems / filters.pageSize)

    return {
      items: page.items.map((product) => ({
        catalogArea: product.catalogArea,
        category: { id: product.categoryId, name: product.categoryName },
        id: product.id,
        imageUrl: product.imagePath === null ? null : imageUrls.get(product.imagePath) ?? null,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        name: product.name,
        price: product.price,
        slug: product.slug,
        stockQuantity: product.stockQuantity,
        stockStatus: getStockStatus(product.stockQuantity, page.lowStockThreshold),
        updatedAt: product.updatedAt,
      })),
      pagination: {
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1,
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems: page.totalItems,
        totalPages,
      },
    }
  }

  public getCategoryOptions(): Promise<readonly IAdminProductCategoryOption[]> {
    return this.repository.findCategoryOptions()
  }

  public async getById(productId: string): Promise<IAdminProductDetailDto> {
    return this.toDetail(await this.requireProduct(productId))
  }

  public async create(
    input: AdminProductCreateRequestType,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto> {
    await this.validateCategory(input.categoryId, input.isActive)
    const slug = this.requireSlug(input.name)

    try {
      const product = await this.repository.create({ ...input, slug })
      this.audit('product_created', product.id, actorProfileId, {
        categoryId: input.categoryId,
        initialStock: input.stockQuantity,
      })
      return this.toDetail(product)
    } catch (error) {
      this.throwSlugConflict(error)
      throw error
    }
  }

  public async update(
    productId: string,
    input: AdminProductUpdateRequestType,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto> {
    await this.requireProduct(productId)
    await this.validateCategory(input.categoryId, input.isActive)

    try {
      const product = await this.repository.update(productId, {
        ...input,
        slug: this.requireSlug(input.name),
      })

      if (product === null) throw this.concurrentUpdateError()

      this.audit('product_updated', product.id, actorProfileId, {
        categoryId: input.categoryId,
      })
      return this.toDetail(product)
    } catch (error) {
      this.throwSlugConflict(error)
      throw error
    }
  }

  public async replaceImage(
    productId: string,
    expectedUpdatedAt: string,
    file: Buffer,
    mimeType: ProductImageMimeType,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto> {
    const current = await this.requireProduct(productId)
    const processedImage = await this.catalogImageService.process(file, mimeType, 'product')
    const newPath = `catalog/${productId}/${randomUUID()}.webp`

    try {
      await this.storageService.upload(
        'products',
        newPath,
        processedImage.file,
        processedImage.mimeType,
      )
    } catch (error) {
      this.logger.error({ error, productId }, 'No fue posible subir la imagen del producto')
      throw new AppError(503, 'No pudimos guardar la imagen', 'PRODUCT_IMAGE_STORAGE_UNAVAILABLE')
    }

    let product: IAdminProductRecord | null

    try {
      product = await this.repository.updateImage(productId, newPath, expectedUpdatedAt)
    } catch (error) {
      await this.removeStorageImageBestEffort(newPath, productId)
      throw error
    }

    if (product === null) {
      await this.removeStorageImageBestEffort(newPath, productId)
      throw this.concurrentUpdateError()
    }

    if (current.imagePath !== null) {
      await this.removeStorageImageBestEffort(current.imagePath, productId)
    }

    this.audit('product_image_replaced', product.id, actorProfileId, {})
    return this.toDetail(product)
  }

  public async removeImage(
    productId: string,
    expectedUpdatedAt: string,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto> {
    const current = await this.requireProduct(productId)

    if (current.imagePath === null) return this.toDetail(current)

    const product = await this.repository.updateImage(productId, null, expectedUpdatedAt)
    if (product === null) throw this.concurrentUpdateError()

    await this.removeStorageImageBestEffort(current.imagePath, productId)
    this.audit('product_image_removed', product.id, actorProfileId, {})
    return this.toDetail(product)
  }

  public async setPublication(
    productId: string,
    input: IAdminProductPublicationRequest,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto> {
    const current = await this.requireProduct(productId)
    if (current.isActive === input.isActive) return this.toDetail(current)
    if (input.isActive) await this.validateCategory(current.categoryId, true)

    const product = await this.repository.updateState(productId, input)
    if (product === null) throw this.concurrentUpdateError()

    this.audit(input.isActive ? 'product_activated' : 'product_deactivated', product.id, actorProfileId, {
      previousValue: current.isActive,
      value: input.isActive,
    })
    return this.toDetail(product)
  }

  public async setFeatured(
    productId: string,
    input: IAdminProductFeaturedRequest,
    actorProfileId: string,
  ): Promise<IAdminProductDetailDto> {
    const current = await this.requireProduct(productId)
    if (current.isFeatured === input.isFeatured) return this.toDetail(current)

    const product = await this.repository.updateState(productId, input)
    if (product === null) throw this.concurrentUpdateError()

    this.audit(
      input.isFeatured ? 'product_featured' : 'product_unfeatured',
      product.id,
      actorProfileId,
      { previousValue: current.isFeatured, value: input.isFeatured },
    )
    return this.toDetail(product)
  }

  public async softDelete(
    productId: string,
    expectedUpdatedAt: string,
    actorProfileId: string,
  ): Promise<void> {
    const current = await this.requireProduct(productId)
    const wasDeleted = await this.repository.softDelete(productId, expectedUpdatedAt)
    if (!wasDeleted) throw this.concurrentUpdateError()

    this.audit('product_soft_deleted', productId, actorProfileId, {
      imagePreserved: current.imagePath !== null,
      isActive: current.isActive,
      isFeatured: current.isFeatured,
      stockPreserved: current.stockQuantity,
    })
  }

  private async toDetail(product: IAdminProductRecord): Promise<IAdminProductDetailDto> {
    const imageUrls = product.imagePath === null
      ? new Map<string, string | null>()
      : await this.storageService.resolveSignedUrls('products', [product.imagePath])

    return {
      catalogArea: product.catalogArea,
      category: { id: product.categoryId, name: product.categoryName },
      description: product.description ?? '',
      id: product.id,
      imageUrl: product.imagePath === null ? null : imageUrls.get(product.imagePath) ?? null,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      name: product.name,
      price: product.price,
      slug: product.slug,
      stockQuantity: product.stockQuantity,
      updatedAt: product.updatedAt,
    }
  }

  private async requireProduct(productId: string): Promise<IAdminProductRecord> {
    const product = await this.repository.findById(productId)
    if (product === null) {
      throw new AppError(404, 'Producto no encontrado', 'ADMIN_PRODUCT_NOT_FOUND')
    }
    return product
  }

  private async validateCategory(categoryId: string, isProductActive: boolean): Promise<void> {
    const category = await this.repository.findCategoryById(categoryId)

    if (category === null) {
      throw new AppError(400, 'La categoría seleccionada no existe', 'PRODUCT_CATEGORY_INVALID')
    }

    if (isProductActive && !category.isActive) {
      throw new AppError(
        409,
        'Activá la categoría antes de publicar este producto',
        'PRODUCT_CATEGORY_INACTIVE',
      )
    }
  }

  private requireSlug(name: string): string {
    const slug = createSlug(name)
    if (slug === '') throw new AppError(400, 'El nombre no genera una URL válida', 'PRODUCT_SLUG_INVALID')
    return slug
  }

  private throwSlugConflict(error: unknown): void {
    if (error instanceof ProductSlugConflictError) {
      throw new AppError(409, 'Ya existe un producto con ese nombre', 'PRODUCT_SLUG_CONFLICT')
    }
  }

  private concurrentUpdateError(): AppError {
    return new AppError(
      409,
      'El producto cambió mientras lo editabas. Recargá la página e intentá nuevamente',
      'PRODUCT_UPDATE_CONFLICT',
    )
  }

  private async removeStorageImageBestEffort(path: string, productId: string): Promise<void> {
    try {
      await this.storageService.remove('products', [path])
    } catch (error) {
      this.logger.warn({ error, path, productId }, 'No fue posible retirar una imagen anterior')
    }
  }

  private audit(
    action: string,
    entityId: string,
    actorProfileId: string,
    metadata: Readonly<Record<string, boolean | number | string>>,
  ): void {
    this.logger.info(
      { action, actorProfileId, entityId, entityType: 'product', metadata },
      'Auditoría administrativa',
    )
  }
}
