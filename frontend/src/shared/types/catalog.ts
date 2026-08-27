export type CatalogAreaType = 'art' | 'decoration'

export interface ICategory {
  catalogArea: CatalogAreaType
  description: string
  displayOrder: number
  id: string
  image: string | null
  isActive: boolean
  isGenericImage?: boolean
  name: string
  slug: string
}

export interface IProduct {
  categoryId: string
  createdAt: string
  description: string
  discountPercentage: number
  id: string
  image: string | null
  isActive: boolean
  isFeatured: boolean
  name: string
  price: number
  salePrice: number
  slug: string
  stockQuantity: number
  updatedAt: string
}
