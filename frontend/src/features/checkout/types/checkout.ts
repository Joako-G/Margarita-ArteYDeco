import type { ICartItem } from '@/features/cart'
import type {
  DeliveryMethodType,
  IOrderConfirmation,
  PaymentMethodType as BasePaymentMethodType,
} from '@/features/public-orders/types/public-orders'

export type { DeliveryMethodType, IOrderConfirmation }
export type PaymentMethodType = BasePaymentMethodType | 'mercado_pago'

export interface ICheckoutFormValues {
  acceptTerms: boolean
  deliveryMethod: DeliveryMethodType
  firstName: string
  lastName: string
  notes: string
  paymentMethod: PaymentMethodType
  phone: string
  shippingAddress: string
}

export interface ICheckoutTotals {
  discount: number
  discountPercentage: number
  subtotal: number
  total: number
}

export interface ICreateOrderItem {
  productId: string
  quantity: number
}

export interface ICreateOrderRequest {
  customer: {
    firstName: string
    lastName: string
    notes: string
    phone: string
  }
  deliveryMethod: DeliveryMethodType
  items: ICreateOrderItem[]
  paymentMethod: PaymentMethodType
  shippingAddress: string
}

export interface ICreateMercadoPagoCheckoutRequest extends Omit<
  ICreateOrderRequest,
  'paymentMethod'
> {
  paymentMethod: 'mercado_pago'
}

export interface IMercadoPagoCheckoutResponse {
  checkoutUrl: string
  orderNumber: string
  reservationExpiresAt: string
}

export type IResumeMercadoPagoCheckoutResponse = IMercadoPagoCheckoutResponse

export type CheckoutCartItemType = Pick<
  ICartItem,
  'discountPercentage' | 'id' | 'image' | 'name' | 'price' | 'quantity' | 'salePrice'
>
