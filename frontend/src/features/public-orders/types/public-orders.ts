export type PaymentMethodType = 'cash' | 'transfer' | 'mercado_pago'
export type DeliveryMethodType = 'pickup' | 'shipping'
export type OrderStatusType =
  | 'cancelled'
  | 'confirmed'
  | 'delivered'
  | 'pending'
  | 'picked_up'
  | 'preparing'
  | 'ready'
export type PaymentStatusType = 'paid' | 'pending' | 'in_process' | 'rejected' | 'approved' | 'expired' | 'manual_review'

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
  delivery: {
    method: DeliveryMethodType
    shippingAddress: string | null
  }
  items: {
    imageUrl: string | null
    listUnitPrice: number
    lineTotal: number
    name: string
    productDiscountPercentage: number
    quantity: number
    unitPrice: number
  }[]
  orderNumber: string
  paymentMethod: PaymentMethodType
  paymentStatus: PaymentStatusType
  reservationExpiresAt: string | null
  pickup: {
    address: string
    businessHours: string
    mapsUrl: string
  }
  status: OrderStatusType
  totals: IOrderTotals
  canResumePayment: boolean
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
