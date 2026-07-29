import type { ICheckoutTotals, PaymentMethodType } from '../types/checkout'

interface ICheckoutPricedItem {
  price: number
  quantity: number
}

export function calculateCheckoutTotals(
  items: ICheckoutPricedItem[],
  paymentMethod: PaymentMethodType,
  transferDiscount: number,
): ICheckoutTotals {
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)
  const discountPercentage = paymentMethod === 'transfer' ? transferDiscount : 0
  const discount = Math.round((subtotal * discountPercentage) / 100)

  return {
    subtotal,
    discount,
    discountPercentage,
    total: subtotal - discount,
  }
}
