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
  inStock: { label: 'Disponible', variant: 'success' },
  lowStock: { label: 'Stock bajo', variant: 'warning' },
  outOfStock: { label: 'Sin stock', variant: 'error' },
} as const

export function AdminProductTable({
  onDeleteRequest,
  onFeaturedChange,
  onPublicationChange,
  pendingAction,
  pendingProductId,
  products,
}: IAdminProductTableProps) {
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
