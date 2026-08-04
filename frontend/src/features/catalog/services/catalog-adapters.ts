import type { ICategory, IProduct } from '@/shared/types/catalog'

import type { IPublicCategoryDto, IPublicProductDto } from '../types/catalog'

export function adaptPublicCategory(category: IPublicCategoryDto): ICategory {
  return {
    catalogArea: category.catalogArea,
    description: category.description,
    displayOrder: category.displayOrder,
    id: category.id,
    image: category.imageUrl,
    isActive: true,
    name: category.name,
    slug: category.slug,
  }
}

export function adaptPublicProduct(product: IPublicProductDto): IProduct {
  return {
    categoryId: product.categoryId,
    createdAt: product.createdAt,
    description: product.description,
    id: product.id,
    image: product.imageUrl,
    isActive: true,
    isFeatured: product.isFeatured,
    name: product.name,
    price: product.price,
    slug: product.slug,
    stockQuantity: product.stockQuantity,
    updatedAt: product.updatedAt,
  }
}
