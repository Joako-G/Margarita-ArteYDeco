export interface IAdminSettingsRecord {
  address: string
  bankName: string
  businessHours: string
  businessName: string
  facebook: string | null
  id: string
  instagram: string | null
  logoPath: string | null
  lowStockThreshold: number
  mapsUrl: string
  transferAlias: string
  transferCbu: string
  transferDiscount: number
  updatedAt: string
  whatsapp: string
}

export interface IAdminSettingsDto {
  address: string
  bankName: string
  businessHours: string
  businessName: string
  facebook: string | null
  instagram: string | null
  logoUrl: string | null
  lowStockThreshold: number
  mapsUrl: string
  transferAlias: string
  transferCbu: string
  transferDiscount: number
  updatedAt: string
  whatsapp: string
}

export interface IAdminSettingsUpdateInput {
  address: string
  bankName: string
  businessHours: string
  businessName: string
  expectedUpdatedAt: string
  facebook: string | null
  instagram: string | null
  lowStockThreshold: number
  mapsUrl: string
  transferAlias: string
  transferCbu: string
  transferDiscount: number
  whatsapp: string
}
