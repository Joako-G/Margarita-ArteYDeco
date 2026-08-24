import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'

import type {
  IConsumerWithdrawalReceipt,
  IConsumerWithdrawalStatus,
  IConsumerWithdrawalStatusPayload,
  ICreateConsumerWithdrawalPayload,
} from '../types/consumer-withdrawals'

async function create(
  payload: ICreateConsumerWithdrawalPayload,
  idempotencyKey: string,
): Promise<IConsumerWithdrawalReceipt> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IConsumerWithdrawalReceipt>>(
      '/public/consumer-withdrawals',
      payload,
      { headers: { 'Idempotency-Key': idempotencyKey, 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, false)
}

async function getStatus(
  payload: IConsumerWithdrawalStatusPayload,
): Promise<IConsumerWithdrawalStatus> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IConsumerWithdrawalStatus>>(
      '/public/consumer-withdrawals/status',
      payload,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, false)
}

export const consumerWithdrawalsService = { create, getStatus }
