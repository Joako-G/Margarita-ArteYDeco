export type PaymentMethodType = 'cash' | 'transfer'
export type OrderStatusType =
  | 'cancelled'
  | 'paid'
  | 'payment_pending'
  | 'pending'
  | 'picked_up'
  | 'preparing'
  | 'ready'

export interface IOrderTotals {
  discount: number
  discountPercentage: number
  subtotal: number
  total: number
}

export interface IOrderConfirmation {
  bankDetails: {
    alias: string
    bankName: string
    cbu: string
  } | null
  createdAt: string
  items: {
    lineTotal: number
    name: string
    quantity: number
    unitPrice: number
  }[]
  orderNumber: string
  paymentMethod: PaymentMethodType
  pickup: {
    address: string
    businessHours: string
    mapsUrl: string
  }
  status: OrderStatusType
  totals: IOrderTotals
  whatsappProofUrl: string
}

export interface IRecoverOrderRequest {
  orderNumber: string
  phone: string
  turnstileToken?: string
}

export interface IRecoverOrderResponse {
  orderNumber: string
  recovered: true
}
