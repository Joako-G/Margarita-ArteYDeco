import { apiClient } from '@/shared/services/api/axios'
import type { IApiResponse } from '@/shared/services/api/types'
import type { IPublicSettings } from '@/shared/types/commerce'

import type { IPublicSettingsDto } from '../types/settings'
import { adaptPublicSettings } from './settings-adapter'

async function fetchPublicSettings(): Promise<IPublicSettings> {
  const response = await apiClient.get<IApiResponse<IPublicSettingsDto>>('/public/settings')

  return adaptPublicSettings(response.data.data)
}

export const settingsService = {
  fetchPublicSettings,
}
