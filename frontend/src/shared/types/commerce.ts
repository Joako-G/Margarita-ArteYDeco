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
  discount: number
  id: string
  orderNumber: string
  paymentMethod: 'cash' | 'transfer'
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
  mapsUrl: string
  transferAlias: string
  transferCbu: string
  transferDiscount: number
  whatsapp: string
}
