import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getApiErrorStatus } from '@/shared/services/api/errors'

import { adminCustomersService } from '../services/admin-customers.service'
import type { IAdminCustomerFilters } from '../types/admin-customers'

export const ADMIN_CUSTOMERS_QUERY_KEY = ['admin', 'customers'] as const

function shouldRetry(failureCount: number, error: Error): boolean {
  const status = getApiErrorStatus(error)
  return failureCount < 1 && status !== 400 && status !== 401 && status !== 403 && status !== 404
}

export function useAdminCustomers(filters: IAdminCustomerFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => adminCustomersService.getCustomers(filters),
    queryKey: [...ADMIN_CUSTOMERS_QUERY_KEY, 'list', filters],
    retry: shouldRetry,
    staleTime: 15_000,
  })
}

export function useAdminCustomer(customerId: string | undefined, ordersPage: number) {
  return useQuery({
    enabled: Boolean(customerId),
    placeholderData: keepPreviousData,
    queryFn: () => adminCustomersService.getCustomer(customerId ?? '', ordersPage),
    queryKey: [...ADMIN_CUSTOMERS_QUERY_KEY, 'detail', customerId, ordersPage],
    retry: shouldRetry,
    staleTime: 15_000,
  })
}
