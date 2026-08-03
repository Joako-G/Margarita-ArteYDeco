import type { ServerSupabaseClient } from '../config/supabase.js'
import { settingsRowSchema } from '../schemas/settings.schema.js'
import type { ISettingsRow } from '../types/settings.js'
import { RepositoryError } from '../utils/app-error.js'

export interface ISettingsRepository {
  findPublic(): Promise<ISettingsRow | null>
}

export class SettingsRepository implements ISettingsRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findPublic(): Promise<ISettingsRow | null> {
    const { data, error } = await this.client
      .from('settings')
      .select(`
        id,
        business_name,
        logo_path,
        whatsapp,
        address,
        maps_url,
        business_hours,
        transfer_discount,
        instagram,
        facebook
      `)
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError()
    }

    if (data === null) {
      return null
    }

    const parsedRow = settingsRowSchema.safeParse(data)

    if (!parsedRow.success) {
      throw new RepositoryError('La configuración pública devolvió un formato inválido')
    }

    return {
      address: parsedRow.data.address,
      businessHours: parsedRow.data.business_hours,
      businessName: parsedRow.data.business_name,
      facebook: parsedRow.data.facebook,
      id: parsedRow.data.id,
      instagram: parsedRow.data.instagram,
      logoPath: parsedRow.data.logo_path,
      mapsUrl: parsedRow.data.maps_url,
      transferDiscount: parsedRow.data.transfer_discount,
      whatsapp: parsedRow.data.whatsapp,
    }
  }
}
