import { useCartStore } from '../stores/cart.store'
import { calculateCartTotals, getCartQuantity } from '../utils/cart-calculations'

export function useCart() {
  const items = useCartStore((state) => state.items)
  const totals = calculateCartTotals(items)

  return {
    ...totals,
    itemCount: getCartQuantity(items),
    items,
  }
}
