import { randomUUID } from 'node:crypto'

import type { Logger } from 'pino'

import type { IAdminSettingsRepository } from '../repositories/admin-settings.repository.js'
import type {
  IAdminSettingsDto,
  IAdminSettingsRecord,
  IAdminSettingsUpdateInput,
} from '../types/admin-settings.js'
import type { IStorageMutationService } from '../types/storage.js'
import { AppError } from '../utils/app-error.js'
import type { SettingsLogoMimeType } from '../utils/product-image.js'

export interface IAdminSettingsService {
  get(): Promise<IAdminSettingsDto>
  removeLogo(expectedUpdatedAt: string, actorProfileId: string): Promise<IAdminSettingsDto>
  replaceLogo(
    expectedUpdatedAt: string,
    file: Buffer,
    mimeType: SettingsLogoMimeType,
    extension: string,
    actorProfileId: string,
  ): Promise<IAdminSettingsDto>
  update(input: IAdminSettingsUpdateInput, actorProfileId: string): Promise<IAdminSettingsDto>
}

export class AdminSettingsService implements IAdminSettingsService {
  public constructor(
    private readonly repository: IAdminSettingsRepository,
    private readonly storageService: IStorageMutationService,
    private readonly logger: Logger,
  ) {}

  public async get(): Promise<IAdminSettingsDto> {
    return this.toDto(await this.requireSettings())
  }

  public async update(
    input: IAdminSettingsUpdateInput,
    actorProfileId: string,
  ): Promise<IAdminSettingsDto> {
    const current = await this.requireSettings()
    this.validateVersion(current, input.expectedUpdatedAt)
    const updated = await this.repository.update(current.id, input)
    if (updated === null) throw this.concurrentUpdateError()

    this.audit('settings_updated', current.id, actorProfileId, {
      operationalFieldsUpdated: true,
    })
    return this.toDto(updated)
  }

  public async replaceLogo(
    expectedUpdatedAt: string,
    file: Buffer,
    mimeType: SettingsLogoMimeType,
    extension: string,
    actorProfileId: string,
  ): Promise<IAdminSettingsDto> {
    const current = await this.requireSettings()
    this.validateVersion(current, expectedUpdatedAt)
    const newPath = `brand/${randomUUID()}.${extension}`

    try {
      await this.storageService.upload('settings', newPath, file, mimeType)
    } catch (error) {
      this.logger.error({ error, settingsId: current.id }, 'No fue posible subir el logo')
      throw new AppError(503, 'No pudimos guardar el logo', 'SETTINGS_LOGO_STORAGE_UNAVAILABLE')
    }

    let updated: IAdminSettingsRecord | null
    try {
      updated = await this.repository.updateLogo(current.id, newPath, expectedUpdatedAt)
    } catch (error) {
      await this.removeStorageLogoBestEffort(newPath, current.id)
      throw error
    }

    if (updated === null) {
      await this.removeStorageLogoBestEffort(newPath, current.id)
      throw this.concurrentUpdateError()
    }

    if (current.logoPath !== null) {
      await this.removeStorageLogoBestEffort(current.logoPath, current.id)
    }

    this.audit('settings_logo_replaced', current.id, actorProfileId, { hadPreviousLogo: current.logoPath !== null })
    return this.toDto(updated)
  }

  public async removeLogo(
    expectedUpdatedAt: string,
    actorProfileId: string,
  ): Promise<IAdminSettingsDto> {
    const current = await this.requireSettings()
    this.validateVersion(current, expectedUpdatedAt)
    if (current.logoPath === null) return this.toDto(current)

    const updated = await this.repository.updateLogo(current.id, null, expectedUpdatedAt)
    if (updated === null) throw this.concurrentUpdateError()
    await this.removeStorageLogoBestEffort(current.logoPath, current.id)
    this.audit('settings_logo_removed', current.id, actorProfileId, {})
    return this.toDto(updated)
  }

  private async toDto(settings: IAdminSettingsRecord): Promise<IAdminSettingsDto> {
    const logoUrls = settings.logoPath === null
      ? new Map<string, string | null>()
      : await this.storageService.resolveSignedUrls('settings', [settings.logoPath])

    return {
      address: settings.address,
      bankName: settings.bankName,
      businessHours: settings.businessHours,
      businessName: settings.businessName,
      facebook: settings.facebook,
      instagram: settings.instagram,
      logoUrl: settings.logoPath === null ? null : (logoUrls.get(settings.logoPath) ?? null),
      lowStockThreshold: settings.lowStockThreshold,
      mapsUrl: settings.mapsUrl,
      transferAlias: settings.transferAlias,
      transferCbu: settings.transferCbu,
      transferDiscount: settings.transferDiscount,
      updatedAt: settings.updatedAt,
      whatsapp: settings.whatsapp,
    }
  }

  private async requireSettings(): Promise<IAdminSettingsRecord> {
    const settings = await this.repository.findOne()
    if (settings === null) {
      throw new AppError(503, 'La configuración del negocio no está disponible', 'SETTINGS_MISSING')
    }
    return settings
  }

  private validateVersion(settings: IAdminSettingsRecord, expectedUpdatedAt: string): void {
    if (settings.updatedAt !== expectedUpdatedAt) throw this.concurrentUpdateError()
  }

  private concurrentUpdateError(): AppError {
    return new AppError(
      409,
      'La configuración cambió mientras la editabas. Recargá la página e intentá nuevamente',
      'SETTINGS_UPDATE_CONFLICT',
    )
  }

  private async removeStorageLogoBestEffort(path: string, settingsId: string): Promise<void> {
    try {
      await this.storageService.remove('settings', [path])
    } catch (error) {
      this.logger.warn({ error, settingsId }, 'No fue posible retirar un logo anterior')
    }
  }

  private audit(
    action: string,
    entityId: string,
    actorProfileId: string,
    metadata: Readonly<Record<string, boolean>>,
  ): void {
    this.logger.info(
      { action, actorProfileId, entityId, entityType: 'settings', metadata },
      'Auditoría administrativa',
    )
  }
}
