import type { IProduct } from '@/shared/types/catalog'

export interface ICartItem extends IProduct {
  quantity: number
}

export interface ICartTotals {
  discount: number
  subtotal: number
  total: number
}
