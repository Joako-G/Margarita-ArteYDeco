export interface IAdminSettings {
  address: string
  bankName: string
  businessHours: string
  businessName: string
  facebook: string | null
  instagram: string | null
  logoUrl: string | null
  lowStockThreshold: number
  mapsUrl: string
  tiktok: string | null
  transferAlias: string
  transferCbu: string
  transferDiscount: number
  updatedAt: string
  whatsapp: string
}

export interface IAdminSettingsUpdatePayload {
  address: string
  bankName: string
  businessHours: string
  businessName: string
  expectedUpdatedAt: string
  facebook: string | null
  instagram: string | null
  lowStockThreshold: number
  mapsUrl: string
  tiktok: string | null
  transferAlias: string
  transferCbu: string
  transferDiscount: number
  whatsapp: string
}
