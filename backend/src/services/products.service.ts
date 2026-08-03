import type { IProductRepository } from '../repositories/products.repository.js'
import type { IProductFilters, IPublicProductDto } from '../types/catalog.js'
import type { IStorageUrlService } from '../types/storage.js'

export interface IProductService {
  listPublic(filters: IProductFilters): Promise<readonly IPublicProductDto[]>
}

export class ProductService implements IProductService {
  public constructor(
    private readonly repository: IProductRepository,
    private readonly storageService: IStorageUrlService,
  ) {}

  public async listPublic(filters: IProductFilters): Promise<readonly IPublicProductDto[]> {
    const products = await this.repository.findPublic(filters)
    const imageUrls = await this.storageService.resolveSignedUrls(
      'products',
      products.flatMap((product) => product.imagePath === null ? [] : [product.imagePath]),
    )

    return products.map((product) => ({
      categoryId: product.categoryId,
      createdAt: product.createdAt,
      description: product.description ?? '',
      id: product.id,
      imageUrl: product.imagePath === null ? null : imageUrls.get(product.imagePath) ?? null,
      isFeatured: product.isFeatured,
      name: product.name,
      price: product.price,
      slug: product.slug,
      stockQuantity: product.stockQuantity,
      updatedAt: product.updatedAt,
    }))
  }
}
