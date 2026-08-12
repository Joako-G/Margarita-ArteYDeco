import type { ISettingsRepository } from '../repositories/settings.repository.js'
import type { IPublicSettingsDto } from '../types/settings.js'
import type { IStorageUrlService } from '../types/storage.js'
import { AppError } from '../utils/app-error.js'

export interface ISettingsService {
  getPublic(): Promise<IPublicSettingsDto>
}

export class SettingsService implements ISettingsService {
  public constructor(
    private readonly repository: ISettingsRepository,
    private readonly storageService: IStorageUrlService,
  ) {}

  public async getPublic(): Promise<IPublicSettingsDto> {
    const settings = await this.repository.findPublic()

    if (settings === null) {
      throw new AppError(503, 'La configuración del negocio no está disponible', 'SETTINGS_MISSING')
    }

    const logoUrls =
      settings.logoPath === null
        ? new Map<string, string | null>()
        : await this.storageService.resolveSignedUrls('settings', [settings.logoPath])

    return {
      address: settings.address,
      businessHours: settings.businessHours,
      businessName: settings.businessName,
      facebook: settings.facebook,
      id: settings.id,
      instagram: settings.instagram,
      logoUrl: settings.logoPath === null ? null : (logoUrls.get(settings.logoPath) ?? null),
      mapsUrl: settings.mapsUrl,
      tiktok: settings.tiktok,
      transferDiscount: settings.transferDiscount,
      whatsapp: settings.whatsapp,
    }
  }
}
