export interface ICustomer {
  firstName: string
  id: string
  lastName: string
  notes: string
  phone: string
  phoneNormalized: string
}

export interface IOrder {
  customerId: string
  deliveryMethod: 'pickup' | 'shipping'
  discount: number
  id: string
  orderNumber: string
  paymentMethod: 'cash' | 'transfer'
  shippingAddress: string | null
  status: 'cancelled' | 'paid' | 'payment_pending' | 'pending' | 'picked_up' | 'preparing' | 'ready'
  subtotal: number
  total: number
}

export interface ISettings {
  address: string
  bankName: string
  businessHours: string
  businessName: string
  facebook: string
  id: string
  instagram: string
  lowStockThreshold: number
  logoUrl: string | null
  mapsUrl: string
  transferAlias: string
  transferCbu: string
  transferDiscount: number
  whatsapp: string
}

export interface IPublicSettings {
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
