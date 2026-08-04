import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'
import { fetchAdminCsrfToken } from '@/features/admin-auth/services/admin-auth.service'

import type {
  IAdminEmailChangeResult,
  IAdminProfileDetail,
  IAdminProfileEmailInput,
  IAdminProfileNameInput,
  IAdminProfilePasswordInput,
} from '../types/admin-profile'

async function get(): Promise<IAdminProfileDetail> {
  const response = await apiClient.get<IApiResponse<IAdminProfileDetail>>('/admin/profile')
  return response.data.data
}

async function updateFullName(input: IAdminProfileNameInput): Promise<IAdminProfileDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.put<IApiResponse<IAdminProfileDetail>>(
      '/admin/profile/name',
      input,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function requestEmailChange(
  input: IAdminProfileEmailInput,
): Promise<IAdminEmailChangeResult> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.put<IApiResponse<IAdminEmailChangeResult>>(
      '/admin/profile/email',
      input,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function updatePassword(input: IAdminProfilePasswordInput): Promise<void> {
  await executeWithCsrf(async (csrfToken) => {
    await apiClient.put(
      '/admin/profile/password',
      input,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
  }, true, fetchAdminCsrfToken)
}

export const adminProfileService = {
  get,
  requestEmailChange,
  updateFullName,
  updatePassword,
}
