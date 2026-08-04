import { apiClient } from '@/shared/services/api/axios'
import type { IApiResponse } from '@/shared/services/api/types'

import type { ICatalogData, IPublicCategoryDto, IPublicProductDto } from '../types/catalog'
import { adaptPublicCategory, adaptPublicProduct } from './catalog-adapters'

async function fetchCatalog(): Promise<ICatalogData> {
  const [categoriesResponse, productsResponse] = await Promise.all([
    apiClient.get<IApiResponse<IPublicCategoryDto[]>>('/public/categories'),
    apiClient.get<IApiResponse<IPublicProductDto[]>>('/public/products'),
  ])

  return {
    categories: categoriesResponse.data.data.map(adaptPublicCategory),
    products: productsResponse.data.data.map(adaptPublicProduct),
  }
}

export const catalogService = {
  fetchCatalog,
}
