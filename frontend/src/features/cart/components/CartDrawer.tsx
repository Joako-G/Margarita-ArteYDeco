import { Minus, PackageOpen, Plus, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import productPlaceholderImage from '@/assets/images/product-placeholder.webp'
import { routes } from '@/config/routes'
import { Button, DeferredImage, Divider, Drawer, EmptyState, IconButton } from '@/shared/components'
import { formatPrice } from '@/shared/utils/format-price'

import { useCart } from '../hooks/useCart'
import { useCartStore } from '../stores/cart.store'
import { getItemAvailabilityLabel } from '../utils/cart-calculations'
import './cart.css'

export function CartDrawer() {
  const navigate = useNavigate()
  const { discount, items, subtotal, total } = useCart()
  const availabilityMessage = useCartStore((state) => state.availabilityMessage)
  const clearCart = useCartStore((state) => state.clearCart)
  const closeCart = useCartStore((state) => state.closeCart)
  const dismissAvailabilityMessage = useCartStore((state) => state.dismissAvailabilityMessage)
  const isCartOpen = useCartStore((state) => state.isCartOpen)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity)

  function handleContinueCheckout() {
    closeCart()
    navigate(routes.checkout)
  }

  function handleViewProducts() {
    closeCart()
    navigate(routes.products)
  }

  return (
    <Drawer className="shopping-cart" isOpen={isCartOpen} onClose={closeCart} title="Tu carrito">
      {availabilityMessage ? (
        <div aria-live="polite" className="shopping-cart__availability" role="status">
          <p>{availabilityMessage}</p>
          <IconButton
            aria-label="Cerrar aviso de disponibilidad"
            onClick={dismissAvailabilityMessage}
          >
            <X aria-hidden="true" size={18} strokeWidth={2} />
          </IconButton>
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          action={<Button onClick={handleViewProducts}>Ver productos</Button>}
          description="Elegí materiales para comenzar a preparar tu próximo proyecto."
          icon={<PackageOpen size={32} strokeWidth={2} />}
          title="Tu carrito está vacío"
        />
      ) : (
        <div className="shopping-cart__content">
          <ul aria-label="Productos en el carrito" className="shopping-cart__items">
            {items.map((item) => (
              <li className="shopping-cart__item" key={item.id}>
                <DeferredImage
                  alt={item.name}
                  fallbackAlt={`Imagen no disponible para ${item.name}`}
                  fallbackSrc={productPlaceholderImage}
                  height="128"
                  src={item.image}
                  width="128"
                />
                <div className="shopping-cart__item-details">
                  <div className="shopping-cart__item-header">
                    <h3>{item.name}</h3>
                    <IconButton
                      aria-label={`Quitar ${item.name} del carrito`}
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
                    </IconButton>
                  </div>
                  <p className="shopping-cart__item-price">{formatPrice(item.price)}</p>
                  <p className="shopping-cart__item-availability">
                    {getItemAvailabilityLabel(item)}
                  </p>
                  <div aria-label={`Cantidad de ${item.name}`} className="shopping-cart__quantity">
                    <IconButton
                      aria-label={`Disminuir cantidad de ${item.name}`}
                      disabled={item.quantity === 1}
                      onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                      variant="secondary"
                    >
                      <Minus aria-hidden="true" size={16} strokeWidth={2} />
                    </IconButton>
                    <output aria-live="polite">{item.quantity}</output>
                    <IconButton
                      aria-label={`Aumentar cantidad de ${item.name}`}
                      disabled={item.quantity === item.stockQuantity}
                      onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      variant="secondary"
                    >
                      <Plus aria-hidden="true" size={16} strokeWidth={2} />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Divider />

          <dl className="shopping-cart__totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div>
              <dt>Descuento</dt>
              <dd>{formatPrice(discount)}</dd>
            </div>
            <div className="shopping-cart__total">
              <dt>Total</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>

          <p className="shopping-cart__discount-note">
            El descuento por transferencia se aplicará al continuar con la compra.
          </p>
          <Button onClick={handleContinueCheckout}>Continuar compra</Button>
          <Button onClick={clearCart} variant="ghost">
            Vaciar carrito
          </Button>
        </div>
      )}
    </Drawer>
  )
}
