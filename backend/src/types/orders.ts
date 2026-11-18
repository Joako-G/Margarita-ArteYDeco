export type PaymentMethodType = 'bank_transfer' | 'cash' | 'mercado_pago'
export type OrderCreationPaymentMethodType = 'bank_transfer' | 'cash'
export type PublicPaymentMethodType = 'cash' | 'transfer' | 'mercado_pago'
export type PaymentStatusType = 'paid' | 'pending' | 'rejected'
export type PublicPaymentStatusType = PaymentStatusType | 'in_process' | 'approved' | 'expired' | 'manual_review'
export type DeliveryMethodType = 'pickup' | 'shipping'

export interface ICreateOrderInput {
  customer: {
    firstName: string
    lastName: string
    notes: string | null
    phone: string
    phoneNormalized: string
  }
  deliveryMethod: DeliveryMethodType
  items: readonly {
    productId: string
    quantity: number
  }[]
  idempotencyKey: string
  requestFingerprint: string
  paymentMethod: OrderCreationPaymentMethodType
  shippingAddress: string | null
}

export interface ICreatedOrderReference {
  orderId: string
  orderNumber: string
}

export interface IOrderRecoveryCandidate {
  id: string
  phoneNormalized: string
}

export interface IOrderRecoveryRequest {
  orderNumber: string
  phone: string
  turnstileToken?: string | undefined
}

export interface IOrderRecoveryResult {
  captchaRequired: boolean
  orderNumber: string
  sessionExpiresAt: Date
  sessionToken: string
}

export interface IOrderConfirmationRow {
  createdAt: string
  customerFirstName: string
  customerLastName: string
  deliveryMethod: DeliveryMethodType
  discount: number
  items: readonly {
    listUnitPrice: number
    imagePath?: string | null
    productName: string
    productDiscountPercentage: number
    quantity: number
    subtotal: number
    unitPrice: number
  }[]
  orderNumber: string
  paymentMethod: PaymentMethodType
  paymentStatus: PaymentStatusType
  shippingAddress: string | null
  status: 'cancelled' | 'confirmed' | 'delivered' | 'pending' | 'picked_up' | 'preparing' | 'ready'
  subtotal: number
  total: number
}

export interface IOrderSettingsRow {
  address: string
  bankName: string
  businessHours: string
  mapsUrl: string
  transferAlias: string
  transferCbu: string
  transferDiscount: number
  whatsapp: string
}

export interface IPublicOrderConfirmationDto {
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
  items: readonly {
    imageUrl: string | null
    listUnitPrice: number
    lineTotal: number
    name: string
    productDiscountPercentage: number
    quantity: number
    unitPrice: number
  }[]
  orderNumber: string
  paymentMethod: PublicPaymentMethodType
  paymentStatus: PublicPaymentStatusType
  reservationExpiresAt: string | null
  pickup: {
    address: string
    businessHours: string
    mapsUrl: string
  }
  status: IOrderConfirmationRow['status']
  totals: {
    discount: number
    discountPercentage: number
    subtotal: number
    total: number
  }
  canResumePayment: boolean
  whatsappProofUrl: string
}
