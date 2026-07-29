import type { ICartItem } from '@/features/cart'

export type PaymentMethodType = 'cash' | 'transfer'
export type OrderStatusType = 'payment_pending' | 'pending'

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

export interface IOrderCustomerSnapshot {
  firstName: string
  lastName: string
  notes: string
  phone: string
  phoneNormalized: string
}

export interface IOrderItemSnapshot {
  lineTotal: number
  name: string
  productId: string
  quantity: number
  unitPrice: number
}

export interface IOrderConfirmation {
  createdAt: string
  customer: IOrderCustomerSnapshot
  items: IOrderItemSnapshot[]
  orderNumber: string
  paymentMethod: PaymentMethodType
  status: OrderStatusType
  totals: ICheckoutTotals
}

export interface IOrderInventoryProduct {
  id: string
  isActive: boolean
  name: string
  price: number
  stockQuantity: number
}

export interface IOrderTransactionInput {
  inventory: IOrderInventoryProduct[]
  orderNumber: string
  request: ICreateOrderRequest
  transferDiscount: number
}

export interface IOrderTransactionResult {
  inventory: IOrderInventoryProduct[]
  order: IOrderConfirmation
}

export type CheckoutCartItemType = Pick<ICartItem, 'id' | 'image' | 'name' | 'price' | 'quantity'>
