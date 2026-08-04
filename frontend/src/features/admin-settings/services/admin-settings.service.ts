import { fetchAdminCsrfToken } from '@/features/admin-auth/services/admin-auth.service'
import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'

import type { IAdminSettings, IAdminSettingsUpdatePayload } from '../types/admin-settings'

async function getSettings(): Promise<IAdminSettings> {
  const response = await apiClient.get<IApiResponse<IAdminSettings>>('/admin/settings')
  return response.data.data
}

async function updateSettings(payload: IAdminSettingsUpdatePayload): Promise<IAdminSettings> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.put<IApiResponse<IAdminSettings>>(
      '/admin/settings',
      payload,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function replaceLogo(image: File, expectedUpdatedAt: string): Promise<IAdminSettings> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.put<IApiResponse<IAdminSettings>>(
      '/admin/settings/logo',
      image,
      {
        headers: { 'Content-Type': image.type, 'X-CSRF-Token': csrfToken },
        params: { expectedUpdatedAt },
      },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function removeLogo(expectedUpdatedAt: string): Promise<IAdminSettings> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.delete<IApiResponse<IAdminSettings>>(
      '/admin/settings/logo',
      {
        data: { expectedUpdatedAt },
        headers: { 'X-CSRF-Token': csrfToken },
      },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

export const adminSettingsService = {
  getSettings,
  removeLogo,
  replaceLogo,
  updateSettings,
}
