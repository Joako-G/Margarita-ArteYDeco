import { apiClient } from '@/shared/services/api/axios'
import type { IApiResponse } from '@/shared/services/api/types'

import type { IAdminDashboard } from '../types/admin-dashboard'

async function getSummary(): Promise<IAdminDashboard> {
  const response = await apiClient.get<IApiResponse<IAdminDashboard>>('/admin/dashboard')
  return response.data.data
}

export const adminDashboardService = { getSummary }
