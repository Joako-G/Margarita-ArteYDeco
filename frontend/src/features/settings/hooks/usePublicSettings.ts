import { useQuery } from '@tanstack/react-query'

import { settingsService } from '../services/settings.service'

export const PUBLIC_SETTINGS_QUERY_KEY = ['public-settings'] as const

export function usePublicSettings() {
  return useQuery({
    queryFn: settingsService.fetchPublicSettings,
    queryKey: PUBLIC_SETTINGS_QUERY_KEY,
    staleTime: 5 * 60_000,
  })
}
