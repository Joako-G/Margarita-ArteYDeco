export interface ICategory {
  description: string
  displayOrder: number
  id: string
  image: string
  isActive: boolean
  isGenericImage?: boolean
  name: string
  slug: string
}

export interface IProduct {
  categoryId: string
  createdAt: string
  description: string
  id: string
  image: string
  isActive: boolean
  isFeatured: boolean
  name: string
  price: number
  slug: string
  stockQuantity: number
  updatedAt: string
}
