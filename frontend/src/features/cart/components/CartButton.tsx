import { ShoppingBag } from 'lucide-react'

import { IconButton } from '@/shared/components'

import { useCart } from '../hooks/useCart'
import { useCartStore } from '../stores/cart.store'

export function CartButton() {
  const { itemCount } = useCart()
  const openCart = useCartStore((state) => state.openCart)
  const itemLabel = itemCount === 1 ? 'producto' : 'productos'

  return (
    <IconButton
      aria-label={`Abrir carrito, ${itemCount} ${itemLabel}`}
      className="cart-button"
      onClick={openCart}
      variant="ghost"
    >
      <ShoppingBag aria-hidden="true" size={22} strokeWidth={2} />
      {itemCount > 0 ? (
        <span aria-hidden="true" className="cart-button__count">
          {itemCount}
        </span>
      ) : null}
    </IconButton>
  )
}
