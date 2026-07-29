import type { ICartItem, ICartTotals } from '../types/cart'

export function calculateCartTotals(items: ICartItem[]): ICartTotals {
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)

  return {
    subtotal,
    discount: 0,
    total: subtotal,
  }
}

export function getCartQuantity(items: ICartItem[]) {
  return items.reduce((quantity, item) => quantity + item.quantity, 0)
}

export function getItemAvailabilityLabel(item: ICartItem) {
  if (!item.isActive || item.stockQuantity === 0) return 'Ya no está disponible.'

  const availableUnits = item.stockQuantity === 1 ? 'unidad disponible' : 'unidades disponibles'

  return `${item.stockQuantity} ${availableUnits}.`
}
