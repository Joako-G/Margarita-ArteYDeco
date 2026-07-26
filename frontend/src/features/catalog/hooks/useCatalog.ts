import { useQuery } from '@tanstack/react-query'

import { catalogService } from '../services/catalog.service'

const CATALOG_QUERY_KEY = ['catalog'] as const

export function useCatalog() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEY,
    queryFn: catalogService.fetchCatalog,
    staleTime: Number.POSITIVE_INFINITY,
  })
}
