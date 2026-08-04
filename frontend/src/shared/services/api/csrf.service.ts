import { apiClient } from './axios'
import { getApiErrorCode } from './errors'
import type { IApiResponse } from './types'

interface ICsrfTokenDto {
  csrfToken: string
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await apiClient.get<IApiResponse<ICsrfTokenDto>>('/public/csrf-token')

  return response.data.data.csrfToken
}

export async function executeWithCsrf<TData>(
  request: (csrfToken: string) => Promise<TData>,
  retryInvalidToken = true,
  getToken: () => Promise<string> = fetchCsrfToken,
): Promise<TData> {
  const csrfToken = await getToken()

  try {
    return await request(csrfToken)
  } catch (error) {
    if (!retryInvalidToken || getApiErrorCode(error) !== 'INVALID_CSRF_TOKEN') throw error

    return request(await getToken())
  }
}
