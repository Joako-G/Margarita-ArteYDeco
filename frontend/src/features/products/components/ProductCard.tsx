import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

import productPlaceholderImage from '@/assets/images/product-placeholder.webp'
import { Badge, Button, Card, DeferredImage, IconButton, Typography } from '@/shared/components'
import { useCartStore } from '@/features/cart'
import type { CatalogAreaType, IProduct } from '@/shared/types/catalog'
import { formatPrice } from '@/shared/utils/format-price'
import './ProductCard.css'

interface IProductCardProps {
  catalogArea: CatalogAreaType
  headingLevel?: 'h2' | 'h3'
  product: IProduct
}

const NEW_PRODUCT_WINDOW = 30 * 24 * 60 * 60 * 1000
const NEW_PRODUCT_REFERENCE_DATE = Date.now()

export function ProductCard({ catalogArea, headingLevel = 'h2', product }: IProductCardProps) {
  const [quantity, setQuantity] = useState(1)
  const addItem = useCartStore((state) => state.addItem)
  const isOutOfStock = product.stockQuantity === 0
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 3
  const isNew =
    NEW_PRODUCT_REFERENCE_DATE - new Date(product.createdAt).getTime() <= NEW_PRODUCT_WINDOW
  const stockUnitLabel = product.stockQuantity === 1 ? 'unidad disponible' : 'unidades disponibles'
  const availabilityLabel = isOutOfStock
    ? 'Sin stock por el momento.'
    : isLowStock
      ? `Solo quedan ${product.stockQuantity} ${stockUnitLabel}.`
      : `${product.stockQuantity} ${stockUnitLabel}.`

  function decreaseQuantity() {
    setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1))
  }

  function increaseQuantity() {
    setQuantity((currentQuantity) => Math.min(product.stockQuantity, currentQuantity + 1))
  }

  function addProductToCart() {
    addItem(product, quantity)
  }

  return (
    <Card className="product-card">
      <div className="product-card__media">
        <DeferredImage
          alt={product.name}
          fallbackAlt={`Imagen no disponible para ${product.name}`}
          fallbackSrc={productPlaceholderImage}
          height="720"
          src={product.image}
          width="720"
        />
        <Badge
          className="product-card__area-badge"
          hidden={catalogArea === 'decoration' || catalogArea === 'art'}
          variant="neutral"
        >
          {catalogArea === 'art' ? 'Para crear' : 'Terminado a mano'}
        </Badge>
        {isOutOfStock ? (
          <Badge className="product-card__badge" variant="error">
            Sin stock
          </Badge>
        ) : product.isFeatured ? (
          <Badge className="product-card__badge" variant="neutral">
            Destacado
          </Badge>
        ) : isNew ? (
          <Badge className="product-card__badge product-card__badge--new" variant="success">
            Nuevo
          </Badge>
        ) : null}
      </div>

      <div className="product-card__content">
        <Typography as={headingLevel} variant="h3">
          {product.name}
        </Typography>
        <Typography variant="small">{product.description}</Typography>
        <p className="product-card__price">{formatPrice(product.price)}</p>
        <p
          className={
            isOutOfStock
              ? 'product-card__availability product-card__availability--empty'
              : 'product-card__availability'
          }
        >
          {availabilityLabel}
        </p>
      </div>

      <div className="product-card__actions">
        <div aria-label={`Cantidad de ${product.name}`} className="product-card__quantity">
          <IconButton
            aria-label={`Disminuir cantidad de ${product.name}`}
            disabled={isOutOfStock || quantity === 1}
            onClick={decreaseQuantity}
            variant="secondary"
          >
            <Minus aria-hidden="true" size={18} strokeWidth={2} />
          </IconButton>
          <output aria-live="polite" className="product-card__quantity-value">
            {quantity}
          </output>
          <IconButton
            aria-label={`Aumentar cantidad de ${product.name}`}
            disabled={isOutOfStock || quantity === product.stockQuantity}
            onClick={increaseQuantity}
            variant="secondary"
          >
            <Plus aria-hidden="true" size={18} strokeWidth={2} />
          </IconButton>
        </div>
        <Button
          aria-label={`Agregar ${product.name} al carrito`}
          disabled={isOutOfStock}
          onClick={addProductToCart}
        >
          Agregar al carrito
        </Button>
      </div>
    </Card>
  )
}
