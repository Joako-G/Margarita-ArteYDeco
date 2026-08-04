import axios from 'axios'

export interface IApiErrorResponse {
  captchaRequired?: boolean
  error?: string
  message?: string
  retryAfterSeconds?: number
  success: false
}

export function getApiErrorResponse(error: unknown): IApiErrorResponse | null {
  if (!axios.isAxiosError<IApiErrorResponse>(error)) return null

  return error.response?.data ?? null
}

export function getApiErrorCode(error: unknown): string | null {
  return getApiErrorResponse(error)?.error ?? null
}

export function getApiErrorStatus(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null

  return error.response?.status ?? null
}
