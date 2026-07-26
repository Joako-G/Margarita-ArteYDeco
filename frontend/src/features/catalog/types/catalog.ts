import type { ICategory, IProduct } from '@/shared/types/catalog'

export interface ICatalogData {
  categories: ICategory[]
  products: IProduct[]
}
