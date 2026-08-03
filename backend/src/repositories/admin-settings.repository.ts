import type { ServerSupabaseClient } from '../config/supabase.js'
import { adminSettingsRowSchema } from '../schemas/admin-settings.schema.js'
import type {
  IAdminSettingsRecord,
  IAdminSettingsUpdateInput,
} from '../types/admin-settings.js'
import { RepositoryError } from '../utils/app-error.js'

export interface IAdminSettingsRepository {
  findOne(): Promise<IAdminSettingsRecord | null>
  update(
    settingsId: string,
    input: IAdminSettingsUpdateInput,
  ): Promise<IAdminSettingsRecord | null>
  updateLogo(
    settingsId: string,
    logoPath: string | null,
    expectedUpdatedAt: string,
  ): Promise<IAdminSettingsRecord | null>
}

const SETTINGS_COLUMNS = `
  id,
  business_name,
  logo_path,
  whatsapp,
  address,
  maps_url,
  business_hours,
  transfer_alias,
  transfer_cbu,
  bank_name,
  transfer_discount,
  low_stock_threshold,
  instagram,
  facebook,
  updated_at
`

function mapSettings(value: unknown): IAdminSettingsRecord {
  const parsed = adminSettingsRowSchema.safeParse(value)
  if (!parsed.success) throw new RepositoryError('Settings devolvió un formato inválido')

  return {
    address: parsed.data.address,
    bankName: parsed.data.bank_name,
    businessHours: parsed.data.business_hours,
    businessName: parsed.data.business_name,
    facebook: parsed.data.facebook,
    id: parsed.data.id,
    instagram: parsed.data.instagram,
    logoPath: parsed.data.logo_path,
    lowStockThreshold: parsed.data.low_stock_threshold,
    mapsUrl: parsed.data.maps_url,
    transferAlias: parsed.data.transfer_alias,
    transferCbu: parsed.data.transfer_cbu,
    transferDiscount: parsed.data.transfer_discount,
    updatedAt: parsed.data.updated_at,
    whatsapp: parsed.data.whatsapp,
  }
}

export class AdminSettingsRepository implements IAdminSettingsRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findOne(): Promise<IAdminSettingsRecord | null> {
    const { data, error } = await this.client.from('settings').select(SETTINGS_COLUMNS).maybeSingle()
    if (error !== null) throw new RepositoryError()
    return data === null ? null : mapSettings(data)
  }

  public async update(
    settingsId: string,
    input: IAdminSettingsUpdateInput,
  ): Promise<IAdminSettingsRecord | null> {
    const { data, error } = await this.client
      .from('settings')
      .update({
        address: input.address,
        bank_name: input.bankName,
        business_hours: input.businessHours,
        business_name: input.businessName,
        facebook: input.facebook,
        instagram: input.instagram,
        low_stock_threshold: input.lowStockThreshold,
        maps_url: input.mapsUrl,
        transfer_alias: input.transferAlias,
        transfer_cbu: input.transferCbu,
        transfer_discount: input.transferDiscount,
        whatsapp: input.whatsapp,
      })
      .eq('id', settingsId)
      .eq('updated_at', input.expectedUpdatedAt)
      .select(SETTINGS_COLUMNS)
      .maybeSingle()

    if (error !== null) throw new RepositoryError()
    return data === null ? null : mapSettings(data)
  }

  public async updateLogo(
    settingsId: string,
    logoPath: string | null,
    expectedUpdatedAt: string,
  ): Promise<IAdminSettingsRecord | null> {
    const { data, error } = await this.client
      .from('settings')
      .update({ logo_path: logoPath })
      .eq('id', settingsId)
      .eq('updated_at', expectedUpdatedAt)
      .select(SETTINGS_COLUMNS)
      .maybeSingle()

    if (error !== null) throw new RepositoryError()
    return data === null ? null : mapSettings(data)
  }
}
