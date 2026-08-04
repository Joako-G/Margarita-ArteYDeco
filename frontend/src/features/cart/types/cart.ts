import type { IProduct } from '@/shared/types/catalog'

export interface ICartItem extends IProduct {
  quantity: number
}

export interface ICartTotals {
  discount: number
  subtotal: number
  total: number
}

export type CartAvailabilityStatusType = 'checking' | 'error' | 'ready'
export type CartAvailabilityChangeReasonType =
  'invalid_quantity' | 'out_of_stock' | 'stock_reduced' | 'unavailable'

export interface ICartAvailabilityChange {
  currentQuantity: number
  previousQuantity: number
  productId: string
  productName: string
  reason: CartAvailabilityChangeReasonType
}
