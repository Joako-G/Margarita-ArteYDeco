import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getApiErrorStatus } from '@/shared/services/api/errors'

import { adminOrdersService } from '../services/admin-orders.service'
import type { IAdminOrderFilters } from '../types/admin-orders'

export const ADMIN_ORDERS_QUERY_KEY = ['admin', 'orders'] as const

export function useAdminOrders(filters: IAdminOrderFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => adminOrdersService.getOrders(filters),
    queryKey: [...ADMIN_ORDERS_QUERY_KEY, filters],
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error)
      return failureCount < 1 && status !== 400 && status !== 401 && status !== 403
    },
    staleTime: 15_000,
  })
}

export function useAdminOrder(orderId: string | undefined) {
  return useQuery({
    enabled: orderId !== undefined,
    queryFn: () => adminOrdersService.getOrder(orderId as string),
    queryKey: [...ADMIN_ORDERS_QUERY_KEY, orderId],
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error)
      return failureCount < 1 && status !== 400 && status !== 401 && status !== 403 && status !== 404
    },
    staleTime: 10_000,
  })
}
