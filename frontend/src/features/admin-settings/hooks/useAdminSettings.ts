import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/app/query-client'
import { ADMIN_DASHBOARD_QUERY_KEY } from '@/features/admin-dashboard/hooks/useAdminDashboard'
import { ADMIN_PRODUCTS_QUERY_KEY } from '@/features/admin-products/hooks/useAdminProducts'
import { PUBLIC_SETTINGS_QUERY_KEY } from '@/features/settings/hooks/usePublicSettings'

import { adminSettingsService } from '../services/admin-settings.service'
import type { IAdminSettingsUpdatePayload } from '../types/admin-settings'

export const ADMIN_SETTINGS_QUERY_KEY = ['admin', 'settings'] as const

export function useAdminSettings() {
  return useQuery({
    queryFn: adminSettingsService.getSettings,
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    retry: false,
  })
}

async function invalidateSettingsQueries(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: PUBLIC_SETTINGS_QUERY_KEY }),
  ])
}

export function useUpdateAdminSettings() {
  return useMutation({
    mutationFn: (payload: IAdminSettingsUpdatePayload) => adminSettingsService.updateSettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(ADMIN_SETTINGS_QUERY_KEY, settings)
      return invalidateSettingsQueries()
    },
  })
}

type AdminSettingsLogoMutationType =
  | { action: 'remove'; expectedUpdatedAt: string }
  | { action: 'replace'; expectedUpdatedAt: string; image: File }

export function useAdminSettingsLogo() {
  return useMutation({
    mutationFn: (input: AdminSettingsLogoMutationType) => input.action === 'replace'
      ? adminSettingsService.replaceLogo(input.image, input.expectedUpdatedAt)
      : adminSettingsService.removeLogo(input.expectedUpdatedAt),
    onSuccess: (settings) => {
      queryClient.setQueryData(ADMIN_SETTINGS_QUERY_KEY, settings)
      return invalidateSettingsQueries()
    },
  })
}
