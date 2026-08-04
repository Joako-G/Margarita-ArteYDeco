import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'

import type { IAdminCredentials, IAdminProfile, IAdminSession } from '../types/admin-auth'

export async function fetchAdminCsrfToken(): Promise<string> {
  const response = await apiClient.get<IApiResponse<{ csrfToken: string }>>(
    '/admin/auth/csrf-token',
  )

  return response.data.data.csrfToken
}

async function login(credentials: IAdminCredentials): Promise<IAdminSession> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IAdminSession>>(
      '/admin/auth/login',
      credentials,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )

    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function getSession(): Promise<IAdminSession> {
  const response = await apiClient.get<IApiResponse<IAdminSession>>('/admin/auth/session')
  return response.data.data
}

async function getProfile(): Promise<IAdminProfile> {
  const response = await apiClient.get<IApiResponse<IAdminProfile>>('/admin/auth/profile')
  return response.data.data
}

async function logout(): Promise<void> {
  await executeWithCsrf(async (csrfToken) => {
    await apiClient.post(
      '/admin/auth/logout',
      {},
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
  }, true, fetchAdminCsrfToken)
}

export const adminAuthService = { getProfile, getSession, login, logout }
