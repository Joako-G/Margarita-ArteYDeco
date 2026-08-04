import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getApiErrorStatus } from '@/shared/services/api/errors'

import { adminCategoriesService } from '../services/admin-categories.service'
import type { IAdminCategoryFilters } from '../types/admin-categories'

export const ADMIN_CATEGORIES_QUERY_KEY = ['admin', 'categories'] as const

export function useAdminCategories(filters: IAdminCategoryFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => adminCategoriesService.getCategories(filters),
    queryKey: [...ADMIN_CATEGORIES_QUERY_KEY, filters],
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error)
      return failureCount < 1 && status !== 400 && status !== 401 && status !== 403
    },
    staleTime: 15_000,
  })
}
