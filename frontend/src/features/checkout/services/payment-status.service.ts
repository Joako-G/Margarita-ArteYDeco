import { apiClient } from '@/shared/services/api/axios'
import type { IApiResponse } from '@/shared/services/api/types'

import type { IPaymentStatus } from '../types/payment-status'

async function fetchPaymentStatus(orderNumber: string): Promise<IPaymentStatus> {
  const response = await apiClient.get<IApiResponse<IPaymentStatus>>(
    `/checkout/mercado-pago/${encodeURIComponent(orderNumber)}/status`,
    {
      headers: {
        'Cache-Control': 'no-cache, no-store',
      },
    },
  )

  return response.data.data
}

export const paymentStatusService = { fetchPaymentStatus }
