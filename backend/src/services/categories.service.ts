import type { ICategoryRepository } from '../repositories/categories.repository.js'
import type {
  ICategoryFilters,
  IPublicCategoryDto,
} from '../types/catalog.js'
import type { IStorageUrlService } from '../types/storage.js'

export interface ICategoryService {
  listPublic(filters: ICategoryFilters): Promise<readonly IPublicCategoryDto[]>
}

export class CategoryService implements ICategoryService {
  public constructor(
    private readonly repository: ICategoryRepository,
    private readonly storageService: IStorageUrlService,
  ) {}

  public async listPublic(filters: ICategoryFilters): Promise<readonly IPublicCategoryDto[]> {
    const categories = await this.repository.findPublic(filters)
    const imageUrls = await this.storageService.resolveSignedUrls(
      'categories',
      categories.map((category) => category.imagePath),
    )

    return categories.map((category) => ({
      catalogArea: category.catalogArea,
      description: category.description ?? '',
      displayOrder: category.displayOrder,
      id: category.id,
      imageUrl: imageUrls.get(category.imagePath) ?? null,
      name: category.name,
      slug: category.slug,
    }))
  }
}
