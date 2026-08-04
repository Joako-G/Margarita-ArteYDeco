import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getApiErrorStatus } from '@/shared/services/api/errors'

import { adminProductsService } from '../services/admin-products.service'
import type { IAdminProductFilters } from '../types/admin-products'

export const ADMIN_PRODUCTS_QUERY_KEY = ['admin', 'products'] as const

export function useAdminProducts(filters: IAdminProductFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => adminProductsService.getProducts(filters),
    queryKey: [...ADMIN_PRODUCTS_QUERY_KEY, filters],
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error)
      return failureCount < 1 && status !== 400 && status !== 401 && status !== 403
    },
    staleTime: 15_000,
  })
}
