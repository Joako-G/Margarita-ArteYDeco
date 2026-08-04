import type { ICartItem } from '@/features/cart'
import type {
  IOrderConfirmation,
  PaymentMethodType,
} from '@/features/public-orders/types/public-orders'

export type { IOrderConfirmation, PaymentMethodType }

export interface ICheckoutFormValues {
  firstName: string
  lastName: string
  notes: string
  paymentMethod: PaymentMethodType
  phone: string
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
  customer: Omit<ICheckoutFormValues, 'paymentMethod'>
  items: ICreateOrderItem[]
  paymentMethod: PaymentMethodType
}

export type CheckoutCartItemType = Pick<ICartItem, 'id' | 'image' | 'name' | 'price' | 'quantity'>
