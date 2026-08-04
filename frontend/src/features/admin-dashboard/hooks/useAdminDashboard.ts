import { useQuery } from '@tanstack/react-query'

import { adminDashboardService } from '../services/admin-dashboard.service'

export const ADMIN_DASHBOARD_QUERY_KEY = ['admin', 'dashboard'] as const

export function useAdminDashboard() {
  return useQuery({
    queryFn: adminDashboardService.getSummary,
    queryKey: ADMIN_DASHBOARD_QUERY_KEY,
    retry: 1,
    staleTime: 30_000,
  })
}
