import { useMutation, useQuery } from '@tanstack/react-query'

import { getApiErrorStatus } from '@/shared/services/api/errors'

import { publicOrdersService } from '../services/public-orders.service'

export const PUBLIC_ORDERS_QUERY_KEY = ['public-orders'] as const
export const RECENT_ORDER_QUERY_KEY = [...PUBLIC_ORDERS_QUERY_KEY, 'recent'] as const

export function getPublicOrderQueryKey(orderNumber: string) {
  return [...PUBLIC_ORDERS_QUERY_KEY, 'detail', orderNumber] as const
}

function retryOrderQuery(failureCount: number, error: unknown): boolean {
  const status = getApiErrorStatus(error)

  if (status !== null && [401, 403, 404, 429].includes(status)) return false

  return failureCount < 1
}

export function usePublicOrder(orderNumber: string, enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => publicOrdersService.fetchOrder(orderNumber),
    queryKey: getPublicOrderQueryKey(orderNumber),
    retry: retryOrderQuery,
    staleTime: 30_000,
  })
}

export function useRecentOrder() {
  return useQuery({
    queryFn: publicOrdersService.fetchRecentOrder,
    queryKey: RECENT_ORDER_QUERY_KEY,
    retry: retryOrderQuery,
    staleTime: 30_000,
  })
}

export function useRecoverOrder() {
  return useMutation({
    mutationFn: publicOrdersService.recoverOrder,
    retry: false,
  })
}

export function useForgetOrders() {
  return useMutation({
    mutationFn: publicOrdersService.forgetOrders,
    retry: false,
  })
}
