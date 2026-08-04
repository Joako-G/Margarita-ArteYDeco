import { fetchAdminCsrfToken } from '@/features/admin-auth/services/admin-auth.service'
import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'

import type {
  IAdminInventoryHistory,
  IAdminStockAdjustmentPayload,
  IAdminStockAdjustmentResult,
} from '../types/admin-inventory'

async function getHistory(
  productId: string,
  page: number,
  pageSize: number,
): Promise<IAdminInventoryHistory> {
  const response = await apiClient.get<IApiResponse<IAdminInventoryHistory>>(
    `/admin/products/${encodeURIComponent(productId)}/inventory`,
    { params: { page, pageSize } },
  )
  return response.data.data
}

async function adjustStock(
  productId: string,
  payload: IAdminStockAdjustmentPayload,
): Promise<IAdminStockAdjustmentResult> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IAdminStockAdjustmentResult>>(
      `/admin/products/${encodeURIComponent(productId)}/inventory-adjustments`,
      payload,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

export const adminInventoryService = { adjustStock, getHistory }
