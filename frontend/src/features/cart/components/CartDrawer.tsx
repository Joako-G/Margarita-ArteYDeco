import { CircleAlert, Minus, PackageOpen, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { queryClient } from '@/app/query-client'
import productPlaceholderImage from '@/assets/images/product-placeholder.webp'
import { routes } from '@/config/routes'
import { CATALOG_QUERY_KEY } from '@/features/catalog/hooks/useCatalog'
import { Button, DeferredImage, Divider, Drawer, EmptyState, IconButton } from '@/shared/components'
import { formatPrice } from '@/shared/utils/format-price'

import { useCart } from '../hooks/useCart'
import { useCartStore } from '../stores/cart.store'
import { getCartAvailabilityChangeMessage } from '../utils/cart-availability'
import { getItemAvailabilityLabel } from '../utils/cart-calculations'
import './cart.css'

export function CartDrawer() {
  const navigate = useNavigate()
  const { discount, items, subtotal, total } = useCart()
  const availabilityChanges = useCartStore((state) => state.availabilityChanges)
  const availabilityStatus = useCartStore((state) => state.availabilityStatus)
  const clearCart = useCartStore((state) => state.clearCart)
  const closeCart = useCartStore((state) => state.closeCart)
  const dismissAvailabilityChanges = useCartStore((state) => state.dismissAvailabilityChanges)
  const isCartOpen = useCartStore((state) => state.isCartOpen)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity)
  const hasUnconfirmedChanges = availabilityChanges.length > 0
  const canContinueCheckout = availabilityStatus === 'ready' && !hasUnconfirmedChanges

  function handleContinueCheckout() {
    closeCart()
    navigate(routes.checkout)
  }

  function handleViewProducts() {
    closeCart()
    navigate(routes.products)
  }

  function handleRetryAvailability() {
    void queryClient.refetchQueries({ queryKey: CATALOG_QUERY_KEY })
  }

  return (
    <Drawer className="shopping-cart" isOpen={isCartOpen} onClose={closeCart} title="Tu carrito">
      {hasUnconfirmedChanges ? (
        <div aria-live="polite" className="shopping-cart__availability" role="status">
          <CircleAlert aria-hidden="true" size={22} strokeWidth={2} />
          <div>
            <strong>Actualizamos tu carrito</strong>
            <ul>
              {availabilityChanges.map((change) => (
                <li key={`${change.productId}-${change.reason}`}>
                  {getCartAvailabilityChangeMessage(change)}
                </li>
              ))}
            </ul>
            <Button onClick={dismissAvailabilityChanges} size="small" variant="ghost">
              Entendido
            </Button>
          </div>
        </div>
      ) : null}

      {items.length > 0 && availabilityStatus === 'checking' ? (
        <div aria-live="polite" className="shopping-cart__sync-status" role="status">
          <RefreshCw aria-hidden="true" className="shopping-cart__sync-icon" size={20} />
          <p>Estamos verificando la disponibilidad de tus productos.</p>
        </div>
      ) : null}

      {items.length > 0 && availabilityStatus === 'error' ? (
        <div className="shopping-cart__sync-status shopping-cart__sync-status--error" role="alert">
          <CircleAlert aria-hidden="true" size={20} strokeWidth={2} />
          <div>
            <p>No pudimos confirmar el stock. Reintentá antes de continuar.</p>
            <Button onClick={handleRetryAvailability} size="small" variant="ghost">
              Reintentar
            </Button>
          </div>
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
          <Button
            disabled={!canContinueCheckout}
            isLoading={availabilityStatus === 'checking'}
            loadingText="Verificando disponibilidad…"
            onClick={handleContinueCheckout}
          >
            {availabilityStatus === 'error'
              ? 'Disponibilidad sin confirmar'
              : hasUnconfirmedChanges
                ? 'Revisá los cambios para continuar'
                : 'Continuar compra'}
          </Button>
          <Button onClick={clearCart} variant="ghost">
            Vaciar carrito
          </Button>
        </div>
      )}
    </Drawer>
  )
}
