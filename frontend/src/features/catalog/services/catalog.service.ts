import { apiClient } from '@/shared/services/api/axios'
import type { IApiResponse } from '@/shared/services/api/types'
import type { ICategory } from '@/shared/types/catalog'

import type { ICatalogData, IPublicCategoryDto, IPublicProductDto } from '../types/catalog'
import { adaptPublicCategory, adaptPublicProduct } from './catalog-adapters'

async function fetchCategories(): Promise<ICategory[]> {
  const response = await apiClient.get<IApiResponse<IPublicCategoryDto[]>>('/public/categories')

  return response.data.data.map(adaptPublicCategory)
}

async function fetchCatalog(): Promise<ICatalogData> {
  const [categories, productsResponse] = await Promise.all([
    fetchCategories(),
    apiClient.get<IApiResponse<IPublicProductDto[]>>('/public/products'),
  ])

  return {
    categories,
    products: productsResponse.data.data.map(adaptPublicProduct),
  }
}

export const catalogService = {
  fetchCatalog,
  fetchCategories,
}
