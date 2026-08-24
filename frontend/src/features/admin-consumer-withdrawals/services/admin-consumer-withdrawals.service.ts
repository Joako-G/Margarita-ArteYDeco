import { fetchAdminCsrfToken } from '@/features/admin-auth/services/admin-auth.service'
import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'
import type { IConsumerWithdrawalReceipt } from '@/features/consumer-withdrawals'

import type {
  IAdminConsumerWithdrawalActionPayload,
  IAdminConsumerWithdrawalDetail,
  IAdminConsumerWithdrawalFilters,
  IAdminConsumerWithdrawalList,
  IAdminConsumerWithdrawalCandidate,
  IAdminConsumerWithdrawalContingencyPayload,
} from '../types/admin-consumer-withdrawals'

async function getList(filters: IAdminConsumerWithdrawalFilters): Promise<IAdminConsumerWithdrawalList> {
  const response = await apiClient.get<IApiResponse<IAdminConsumerWithdrawalList>>('/admin/consumer-withdrawals', { params: filters })
  return response.data.data
}

async function getDetail(requestId: string): Promise<IAdminConsumerWithdrawalDetail> {
  const response = await apiClient.get<IApiResponse<IAdminConsumerWithdrawalDetail>>(`/admin/consumer-withdrawals/${encodeURIComponent(requestId)}`)
  return response.data.data
}

async function executeAction(requestId: string, payload: IAdminConsumerWithdrawalActionPayload): Promise<IAdminConsumerWithdrawalDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IAdminConsumerWithdrawalDetail>>(
      `/admin/consumer-withdrawals/${encodeURIComponent(requestId)}/actions`,
      payload,
      { headers: { 'Idempotency-Key': crypto.randomUUID(), 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function getCandidates(requestId: string): Promise<readonly IAdminConsumerWithdrawalCandidate[]> {
  const response = await apiClient.get<IApiResponse<readonly IAdminConsumerWithdrawalCandidate[]>>(`/admin/consumer-withdrawals/${encodeURIComponent(requestId)}/order-candidates`)
  return response.data.data
}

async function linkOrder(requestId: string, payload: { expectedVersion: number; note: string; orderId: string }): Promise<IAdminConsumerWithdrawalDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IAdminConsumerWithdrawalDetail>>(`/admin/consumer-withdrawals/${encodeURIComponent(requestId)}/order-link`, payload, { headers: { 'Idempotency-Key': crypto.randomUUID(), 'X-CSRF-Token': csrfToken } })
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function createContingency(payload: IAdminConsumerWithdrawalContingencyPayload): Promise<IConsumerWithdrawalReceipt> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IConsumerWithdrawalReceipt>>('/admin/consumer-withdrawals/contingency', payload, { headers: { 'Idempotency-Key': crypto.randomUUID(), 'X-CSRF-Token': csrfToken } })
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

export const adminConsumerWithdrawalsService = { createContingency, executeAction, getCandidates, getDetail, getList, linkOrder }
