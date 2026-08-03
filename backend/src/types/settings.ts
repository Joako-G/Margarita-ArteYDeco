export interface ISettingsRow {
  address: string
  businessHours: string
  businessName: string
  facebook: string | null
  id: string
  instagram: string | null
  logoPath: string | null
  mapsUrl: string
  transferDiscount: number
  whatsapp: string
}

export interface IPublicSettingsDto {
  address: string
  businessHours: string
  businessName: string
  facebook: string | null
  id: string
  instagram: string | null
  logoUrl: string | null
  mapsUrl: string
  transferDiscount: number
  whatsapp: string
}
