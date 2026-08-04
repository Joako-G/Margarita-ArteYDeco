import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'

import type { ICreateOrderRequest, IOrderConfirmation } from '../types/checkout'

async function submitOrder(
  request: ICreateOrderRequest,
  csrfToken: string,
): Promise<IOrderConfirmation> {
  const response = await apiClient.post<IApiResponse<IOrderConfirmation>>('/orders', request, {
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  })

  return response.data.data
}

async function createOrder(request: ICreateOrderRequest): Promise<IOrderConfirmation> {
  return executeWithCsrf((csrfToken) => submitOrder(request, csrfToken))
}

export const checkoutService = {
  createOrder,
}
