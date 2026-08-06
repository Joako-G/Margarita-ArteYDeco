import type { ICartItem } from '@/features/cart'
import type {
  DeliveryMethodType,
  IOrderConfirmation,
  PaymentMethodType,
} from '@/features/public-orders/types/public-orders'

export type { DeliveryMethodType, IOrderConfirmation, PaymentMethodType }

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
  customer: Omit<ICheckoutFormValues, 'acceptTerms' | 'deliveryMethod' | 'paymentMethod' | 'shippingAddress'>
  deliveryMethod: DeliveryMethodType
  items: ICreateOrderItem[]
  paymentMethod: PaymentMethodType
  shippingAddress: string
}

export type CheckoutCartItemType = Pick<ICartItem, 'id' | 'image' | 'name' | 'price' | 'quantity'>
