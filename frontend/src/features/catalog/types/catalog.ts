import type { ICategory, IProduct } from '@/shared/types/catalog'

export interface IPublicCategoryDto {
  catalogArea: 'art' | 'decoration'
  description: string
  displayOrder: number
  id: string
  imageUrl: string | null
  name: string
  slug: string
}

export interface IPublicProductDto {
  categoryId: string
  createdAt: string
  description: string
  id: string
  imageUrl: string | null
  isFeatured: boolean
  name: string
  price: number
  slug: string
  stockQuantity: number
  updatedAt: string
}

export interface ICatalogData {
  categories: ICategory[]
  products: IProduct[]
}
