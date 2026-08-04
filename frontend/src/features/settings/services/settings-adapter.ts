import type { IPublicSettings } from '@/shared/types/commerce'

import type { IPublicSettingsDto } from '../types/settings'

export function adaptPublicSettings(settings: IPublicSettingsDto): IPublicSettings {
  return {
    address: settings.address,
    businessHours: settings.businessHours,
    businessName: settings.businessName,
    facebook: settings.facebook,
    id: settings.id,
    instagram: settings.instagram,
    logoUrl: settings.logoUrl,
    mapsUrl: settings.mapsUrl,
    transferDiscount: settings.transferDiscount,
    whatsapp: settings.whatsapp,
  }
}
