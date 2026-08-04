import { fetchAdminCsrfToken } from '@/features/admin-auth/services/admin-auth.service'
import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'

import type {
  AdminOrderActionType,
  IAdminOrderCancellationResult,
  IAdminOrderDetail,
  IAdminOrderFilters,
  IAdminOrderList,
} from '../types/admin-orders'

async function getOrders(filters: IAdminOrderFilters): Promise<IAdminOrderList> {
  const response = await apiClient.get<IApiResponse<IAdminOrderList>>('/admin/orders', {
    params: filters,
  })
  return response.data.data
}

async function getOrder(orderId: string): Promise<IAdminOrderDetail> {
  const response = await apiClient.get<IApiResponse<IAdminOrderDetail>>(
    `/admin/orders/${encodeURIComponent(orderId)}`,
  )
  return response.data.data
}

async function executeOrderAction(
  orderId: string,
  action: AdminOrderActionType,
  expectedUpdatedAt: string,
): Promise<IAdminOrderDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IAdminOrderDetail>>(
      `/admin/orders/${encodeURIComponent(orderId)}/actions`,
      { action, expectedUpdatedAt },
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function cancelOrder(
  orderId: string,
  payload: {
    confirmManualRefund: boolean
    expectedUpdatedAt: string
    reason: string
  },
): Promise<IAdminOrderCancellationResult> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IAdminOrderCancellationResult>>(
      `/admin/orders/${encodeURIComponent(orderId)}/cancellation`,
      payload,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

export const adminOrdersService = {
  cancelOrder,
  executeOrderAction,
  getOrder,
  getOrders,
}
