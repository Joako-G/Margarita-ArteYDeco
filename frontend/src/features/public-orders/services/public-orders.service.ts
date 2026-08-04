import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'

import type {
  IOrderConfirmation,
  IRecoverOrderRequest,
  IRecoverOrderResponse,
} from '../types/public-orders'

async function fetchOrder(orderNumber: string): Promise<IOrderConfirmation> {
  const response = await apiClient.get<IApiResponse<IOrderConfirmation>>(
    `/public/orders/${encodeURIComponent(orderNumber)}`,
  )

  return response.data.data
}

async function fetchRecentOrder(): Promise<IOrderConfirmation | null> {
  const response = await apiClient.get<IApiResponse<IOrderConfirmation | null>>(
    '/public/orders/recent',
  )

  return response.data.data
}

async function recoverOrder(request: IRecoverOrderRequest): Promise<IRecoverOrderResponse> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IRecoverOrderResponse>>(
      '/public/orders/recover',
      request,
      {
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      },
    )

    return response.data.data
  }, false)
}

async function forgetOrders(): Promise<void> {
  await executeWithCsrf(async (csrfToken) => {
    await apiClient.delete('/public/guest-session', {
      headers: {
        'X-CSRF-Token': csrfToken,
      },
    })
  })
}

export const publicOrdersService = {
  fetchOrder,
  fetchRecentOrder,
  forgetOrders,
  recoverOrder,
}
