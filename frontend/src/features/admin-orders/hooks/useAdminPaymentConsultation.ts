import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ADMIN_DASHBOARD_QUERY_KEY } from '@/features/admin-dashboard/hooks/useAdminDashboard'
import { ADMIN_INVENTORY_QUERY_KEY } from '@/features/admin-inventory/hooks/useAdminInventory'
import { ADMIN_PRODUCTS_QUERY_KEY } from '@/features/admin-products/hooks/useAdminProducts'
import { CATALOG_QUERY_KEY } from '@/features/catalog/hooks/useCatalog'

import { adminOrdersService } from '../services/admin-orders.service'
import { consultAdminPayment } from '../utils/admin-payment-consultation'
import { ADMIN_ORDERS_QUERY_KEY, ADMIN_PAYMENT_RECONCILIATION_QUERY_KEY } from './useAdminOrders'

export function useAdminPaymentConsultation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ attemptId, orderId }: { attemptId: string; orderId: string }) =>
      consultAdminPayment(
        () => adminOrdersService.executePaymentAction(attemptId, 'sync'),
        () => adminOrdersService.getOrder(orderId),
      ),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_PAYMENT_RECONCILIATION_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_INVENTORY_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY }),
      ])
    },
  })
}
