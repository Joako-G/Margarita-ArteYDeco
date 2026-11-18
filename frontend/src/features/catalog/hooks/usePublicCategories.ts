import { useQuery } from '@tanstack/react-query'

import { catalogService } from '../services/catalog.service'

export const PUBLIC_CATEGORIES_QUERY_KEY = ['public-categories'] as const

export function usePublicCategories() {
  return useQuery({
    queryFn: catalogService.fetchCategories,
    queryKey: PUBLIC_CATEGORIES_QUERY_KEY,
    staleTime: 5 * 60_000,
  })
}
