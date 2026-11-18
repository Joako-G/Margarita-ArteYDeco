import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'

import type {
  ICreateMercadoPagoCheckoutRequest,
  ICreateOrderRequest,
  IMercadoPagoCheckoutResponse,
  IResumeMercadoPagoCheckoutResponse,
  IOrderConfirmation,
} from '../types/checkout'

async function submitOrder(
  request: ICreateOrderRequest,
  csrfToken: string,
  idempotencyKey: string,
): Promise<IOrderConfirmation> {
  const response = await apiClient.post<IApiResponse<IOrderConfirmation>>('/orders', request, {
    headers: {
      'Idempotency-Key': idempotencyKey,
      'X-CSRF-Token': csrfToken,
    },
  })

  return response.data.data
}

async function createOrder(request: ICreateOrderRequest): Promise<IOrderConfirmation> {
  return executeWithCsrf((csrfToken) => submitOrder(request, csrfToken, crypto.randomUUID()))
}

async function createMercadoPagoCheckout(
  request: ICreateMercadoPagoCheckoutRequest,
): Promise<IMercadoPagoCheckoutResponse> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IMercadoPagoCheckoutResponse>>(
      '/checkout/mercado-pago',
      request,
      {
        headers: {
          'Idempotency-Key': crypto.randomUUID(),
          'X-CSRF-Token': csrfToken,
        },
      },
    )

    return response.data.data
  })
}

async function resumeMercadoPagoCheckout(orderNumber: string): Promise<IResumeMercadoPagoCheckoutResponse> {
  const response = await apiClient.get<IApiResponse<IResumeMercadoPagoCheckoutResponse>>(
    `/checkout/mercado-pago/${encodeURIComponent(orderNumber)}`,
  )

  return response.data.data
}

export const checkoutService = {
  createOrder,
  createMercadoPagoCheckout,
  resumeMercadoPagoCheckout,
}
