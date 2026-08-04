import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import productPlaceholderImage from '@/assets/images/product-placeholder.webp'
import { routes } from '@/config/routes'
import { Badge, Button, DeferredImage, Switch } from '@/shared/components'
import { formatPrice } from '@/shared/utils/format-price'

import type {
  AdminProductLifecycleActionType,
  IAdminProduct,
} from '../types/admin-products'
import {
  formatAdminProductDate,
  formatRelativeAdminProductDate,
  getAdminProductCatalogAreaLabel,
} from '../utils/admin-product-formatters'

interface IAdminProductTableProps {
  onDeleteRequest: (product: IAdminProduct) => void
  onFeaturedChange: (product: IAdminProduct, value: boolean) => void
  onPublicationChange: (product: IAdminProduct, value: boolean) => void
  pendingAction: AdminProductLifecycleActionType | null
  pendingProductId: string | null
  products: readonly IAdminProduct[]
}

const STOCK_DETAILS = {
  inStock: { label: 'Disponible', mobileLabel: 'Stock disponible', variant: 'success' },
  lowStock: { label: 'Stock bajo', mobileLabel: 'Stock bajo', variant: 'warning' },
  outOfStock: { label: 'Sin stock', mobileLabel: 'Sin stock', variant: 'error' },
} as const

const MOBILE_MEDIA_QUERY = '(max-width: 39.999rem)'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MEDIA_QUERY).matches : false,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}

function AdminProductCard({
  product,
  onDeleteRequest,
  onFeaturedChange,
  onPublicationChange,
  pendingProductId,
  pendingAction,
}: {
  onDeleteRequest: (product: IAdminProduct) => void
  onFeaturedChange: (product: IAdminProduct, value: boolean) => void
  onPublicationChange: (product: IAdminProduct, value: boolean) => void
  pendingAction: AdminProductLifecycleActionType | null
  pendingProductId: string | null
  product: IAdminProduct
}) {
  const stockDetails = STOCK_DETAILS[product.stockStatus]
  const isPending = pendingProductId === product.id

  return (
    <article className="admin-product-card">
      <div className="admin-product-card__media">
        <DeferredImage
          alt={`Vista previa de ${product.name}`}
          className="admin-product-card__image"
          fallbackAlt="Imagen no disponible"
          fallbackSrc={productPlaceholderImage}
          height={240}
          src={product.imageUrl}
          width={320}
        />
      </div>
      <div className="admin-product-card__body">
        <div className="admin-product-card__main">
          <h3 className="admin-product-card__name">{product.name}</h3>
          <p className="admin-product-card__price">{formatPrice(product.price)}</p>
        </div>

        <div className="admin-product-card__stock">
          <Badge variant={stockDetails.variant}>
            <span
              aria-hidden="true"
              className={`admin-product-card__stock-dot admin-product-card__stock-dot--${product.stockStatus}`}
            />
            {stockDetails.mobileLabel}
          </Badge>
          <span className="admin-product-card__stock-quantity">
            {product.stockQuantity} {product.stockQuantity === 1 ? 'unidad' : 'unidades'}
          </span>
        </div>

        <p className="admin-product-card__category">
          {product.category.name}
          <span aria-hidden="true" className="admin-product-card__category-separator">
            ·
          </span>
          {getAdminProductCatalogAreaLabel(product.catalogArea)}
        </p>

        <div className="admin-product-card__status">
          <Switch
            aria-label={`${product.isActive ? 'Ocultar' : 'Mostrar'} ${product.name} en la tienda`}
            checked={product.isActive}
            disabled={isPending}
            label={product.isActive ? 'Visible en la tienda' : 'Oculto'}
            onChange={(event) => onPublicationChange(product, event.target.checked)}
          />
          <Switch
            aria-label={`${product.isFeatured ? 'Quitar de' : 'Agregar a'} recomendados: ${product.name}`}
            checked={product.isFeatured}
            disabled={isPending}
            label={product.isFeatured ? 'Recomendado' : 'No recomendado'}
            onChange={(event) => onFeaturedChange(product, event.target.checked)}
          />
        </div>

        <div className="admin-product-card__actions">
          <Link
            aria-label={`Editar ${product.name}`}
            className="admin-product-card__edit"
            to={routes.adminProductEdit(product.id)}
          >
            <Pencil aria-hidden="true" size={18} />
            Editar
          </Link>
          <Button
            aria-label={`Eliminar ${product.name}`}
            className="admin-product-card__delete"
            disabled={isPending}
            isLoading={isPending && pendingAction === 'delete'}
            loadingText="Eliminando…"
            onClick={() => onDeleteRequest(product)}
            variant="ghost"
          >
            <Trash2 aria-hidden="true" size={18} />
            Eliminar
          </Button>
        </div>

        <time
          className="admin-product-card__updated"
          dateTime={product.updatedAt}
          title={formatAdminProductDate(product.updatedAt)}
        >
          {formatRelativeAdminProductDate(product.updatedAt)}
        </time>
      </div>
    </article>
  )
}

export function AdminProductTable({
  onDeleteRequest,
  onFeaturedChange,
  onPublicationChange,
  pendingAction,
  pendingProductId,
  products,
}: IAdminProductTableProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="admin-product-cards" role="region" aria-label="Listado de productos">
        {products.map((product) => (
          <AdminProductCard
            key={product.id}
            onDeleteRequest={onDeleteRequest}
            onFeaturedChange={onFeaturedChange}
            onPublicationChange={onPublicationChange}
            pendingAction={pendingAction}
            pendingProductId={pendingProductId}
            product={product}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="admin-product-table" role="region" aria-label="Listado de productos">
      <table>
        <caption className="sr-only">Productos del catálogo administrativo</caption>
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">Categoría</th>
            <th scope="col">Precio</th>
            <th scope="col">Stock</th>
            <th scope="col">Publicación</th>
            <th scope="col">Destacado</th>
            <th scope="col">Actualizado</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const stockDetails = STOCK_DETAILS[product.stockStatus]
            const isPending = pendingProductId === product.id

            return (
              <tr key={product.id}>
                <td data-label="Producto">
                  <div className="admin-product-table__identity">
                    <DeferredImage
                      alt={`Vista previa de ${product.name}`}
                      className="admin-product-table__image"
                      fallbackAlt="Imagen no disponible"
                      fallbackSrc={productPlaceholderImage}
                      height={56}
                      src={product.imageUrl}
                      width={56}
                    />
                    <div>
                      <strong>{product.name}</strong>
                      <span>/{product.slug}</span>
                    </div>
                  </div>
                </td>
                <td data-label="Categoría">
                  <span className="admin-product-table__stacked-value">
                    <strong>{product.category.name}</strong>
                    <span>{getAdminProductCatalogAreaLabel(product.catalogArea)}</span>
                  </span>
                </td>
                <td data-label="Precio">
                  <strong className="admin-product-table__numeric">
                    {formatPrice(product.price)}
                  </strong>
                </td>
                <td data-label="Stock">
                  <span className="admin-product-table__stock">
                    <Badge variant={stockDetails.variant}>{stockDetails.label}</Badge>
                    <span className="admin-product-table__numeric">{product.stockQuantity} u.</span>
                  </span>
                </td>
                <td data-label="Publicación">
                  <Switch
                    aria-label={`${product.isActive ? 'Desactivar' : 'Activar'} ${product.name}`}
                    checked={product.isActive}
                    disabled={isPending}
                    label={product.isActive ? 'Activo' : 'Inactivo'}
                    onChange={(event) => onPublicationChange(product, event.target.checked)}
                  />
                </td>
                <td data-label="Destacado">
                  <Switch
                    aria-label={`${product.isFeatured ? 'Quitar de' : 'Agregar a'} destacados: ${product.name}`}
                    checked={product.isFeatured}
                    disabled={isPending}
                    label={product.isFeatured ? 'Sí' : 'No'}
                    onChange={(event) => onFeaturedChange(product, event.target.checked)}
                  />
                </td>
                <td data-label="Actualizado">
                  <time dateTime={product.updatedAt}>
                    {formatAdminProductDate(product.updatedAt)}
                  </time>
                </td>
                <td data-label="Acciones">
                  <div className="admin-product-table__actions">
                    <Link
                      aria-label={`Editar ${product.name}`}
                      className="admin-product-table__edit"
                      to={routes.adminProductEdit(product.id)}
                    >
                      <Pencil aria-hidden="true" size={17} />
                      <span>Editar</span>
                    </Link>
                    <Button
                      aria-label={`Eliminar ${product.name}`}
                      className="admin-product-table__delete"
                      disabled={isPending}
                      isLoading={isPending && pendingAction === 'delete'}
                      loadingText="Eliminando…"
                      onClick={() => onDeleteRequest(product)}
                      size="small"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" size={17} />
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
