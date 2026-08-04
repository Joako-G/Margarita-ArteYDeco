import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/app/query-client'
import { ADMIN_DASHBOARD_QUERY_KEY } from '@/features/admin-dashboard/hooks/useAdminDashboard'
import { ADMIN_PRODUCTS_QUERY_KEY } from '@/features/admin-products/hooks/useAdminProducts'
import { CATALOG_QUERY_KEY } from '@/features/catalog/hooks/useCatalog'
import { getApiErrorStatus } from '@/shared/services/api/errors'

import { adminInventoryService } from '../services/admin-inventory.service'
import type { IAdminStockAdjustmentPayload } from '../types/admin-inventory'

export const ADMIN_INVENTORY_QUERY_KEY = ['admin', 'inventory'] as const

export function useAdminInventory(productId: string, page: number, pageSize = 10) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => adminInventoryService.getHistory(productId, page, pageSize),
    queryKey: [...ADMIN_INVENTORY_QUERY_KEY, productId, page, pageSize],
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error)
      return failureCount < 1 && status !== 400 && status !== 401 && status !== 403 && status !== 404
    },
    staleTime: 10_000,
  })
}

export function useAdjustAdminStock(productId: string) {
  return useMutation({
    mutationFn: (payload: IAdminStockAdjustmentPayload) => (
      adminInventoryService.adjustStock(productId, payload)
    ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_INVENTORY_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: [...ADMIN_PRODUCTS_QUERY_KEY, 'detail', productId],
        }),
      ])
    },
  })
}
