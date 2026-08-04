import { fetchAdminCsrfToken } from '@/features/admin-auth/services/admin-auth.service'
import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'

import type {
  IAdminCustomerDetail,
  IAdminCustomerFilters,
  IAdminCustomerList,
  IAdminCustomerUpdatePayload,
} from '../types/admin-customers'

async function getCustomers(filters: IAdminCustomerFilters): Promise<IAdminCustomerList> {
  const response = await apiClient.get<IApiResponse<IAdminCustomerList>>('/admin/customers', {
    params: filters,
  })
  return response.data.data
}

async function getCustomer(
  customerId: string,
  page: number,
  pageSize = 10,
): Promise<IAdminCustomerDetail> {
  const response = await apiClient.get<IApiResponse<IAdminCustomerDetail>>(
    `/admin/customers/${encodeURIComponent(customerId)}`,
    { params: { page, pageSize } },
  )
  return response.data.data
}

async function updateCustomer(
  customerId: string,
  payload: IAdminCustomerUpdatePayload,
): Promise<IAdminCustomerDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.put<IApiResponse<IAdminCustomerDetail>>(
      `/admin/customers/${encodeURIComponent(customerId)}`,
      payload,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function softDeleteCustomer(customerId: string, expectedUpdatedAt: string): Promise<void> {
  return executeWithCsrf(async (csrfToken) => {
    await apiClient.delete(`/admin/customers/${encodeURIComponent(customerId)}`, {
      data: { expectedUpdatedAt },
      headers: { 'X-CSRF-Token': csrfToken },
    })
  }, true, fetchAdminCsrfToken)
}

export const adminCustomersService = {
  getCustomer,
  getCustomers,
  softDeleteCustomer,
  updateCustomer,
}
