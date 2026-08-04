import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ADMIN_DASHBOARD_QUERY_KEY } from '@/features/admin-dashboard/hooks/useAdminDashboard'
import { ADMIN_PRODUCTS_QUERY_KEY } from '@/features/admin-products/hooks/useAdminProducts'

import { adminOrdersService } from '../services/admin-orders.service'
import type { AdminOrderActionType, IAdminOrderDetail } from '../types/admin-orders'
import { ADMIN_ORDERS_QUERY_KEY } from './useAdminOrders'

type AdminOrderLifecycleInputType =
  | {
      action: 'cancel'
      confirmManualRefund: boolean
      order: IAdminOrderDetail
      reason: string
    }
  | {
      action: 'transition'
      order: IAdminOrderDetail
      transition: AdminOrderActionType
    }

export function useAdminOrderLifecycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AdminOrderLifecycleInputType) => {
      if (input.action === 'cancel') {
        return adminOrdersService.cancelOrder(input.order.id, {
          confirmManualRefund: input.confirmManualRefund,
          expectedUpdatedAt: input.order.updatedAt,
          reason: input.reason,
        })
      }
      const order = await adminOrdersService.executeOrderAction(
        input.order.id,
        input.transition,
        input.order.updatedAt,
      )
      return { order, stockRestored: false as const }
    },
    onSuccess: async (result) => {
      queryClient.setQueryData([...ADMIN_ORDERS_QUERY_KEY, result.order.id], result.order)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY }),
        ...(result.stockRestored
          ? [queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })]
          : []),
      ])
    },
  })
}
