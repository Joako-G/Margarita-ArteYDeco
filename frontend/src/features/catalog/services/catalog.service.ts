import { categoriesMock, productsMock } from '@/mocks'

import type { ICatalogData } from '../types/catalog'

async function fetchCatalog(): Promise<ICatalogData> {
  return {
    categories: categoriesMock,
    products: productsMock,
  }
}

export const catalogService = {
  fetchCatalog,
}
