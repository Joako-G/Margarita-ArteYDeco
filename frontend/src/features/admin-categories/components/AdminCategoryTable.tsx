import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'
import { Badge, Button, DeferredImage, Switch } from '@/shared/components'

import type {
  AdminCategoryLifecycleActionType,
  IAdminCategory,
} from '../types/admin-categories'

interface IAdminCategoryTableProps {
  categories: readonly IAdminCategory[]
  onDeleteRequest: (category: IAdminCategory) => void
  onPublicationChange: (category: IAdminCategory, value: boolean) => void
  pendingAction: AdminCategoryLifecycleActionType | null
  pendingCategoryId: string | null
}

type AdminCategoryListLayoutType = 'mobile' | 'card' | 'table'

const LAYOUT_MEDIA_QUERY = '(min-width: 80rem)'
const MOBILE_MEDIA_QUERY = '(max-width: 39.999rem)'

function useAdminCategoryListLayout() {
  const [layout, setLayout] = useState<AdminCategoryListLayoutType>(() => {
    if (typeof window === 'undefined') return 'table'

    return window.matchMedia(LAYOUT_MEDIA_QUERY).matches ? 'table' : 'mobile'
  })

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const layoutQuery = window.matchMedia(LAYOUT_MEDIA_QUERY)

    const handleChange = () => {
      if (layoutQuery.matches) {
        setLayout('table')
      } else if (mobileQuery.matches) {
        setLayout('mobile')
      } else {
        setLayout('card')
      }
    }

    mobileQuery.addEventListener('change', handleChange)
    layoutQuery.addEventListener('change', handleChange)

    return () => {
      mobileQuery.removeEventListener('change', handleChange)
      layoutQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return layout
}

function getAreaLabel(area: 'art' | 'decoration'): string {
  return area === 'art' ? 'Arte' : 'Decoración'
}

function formatProductCount(count: number): string {
  return `${count} ${count === 1 ? 'producto' : 'productos'}`
}

function AdminCategoryAreaChip({ area }: { area: 'art' | 'decoration' }) {
  return (
    <Badge className={`admin-category-area admin-category-area--${area}`} variant="neutral">
      {getAreaLabel(area)}
    </Badge>
  )
}

function AdminCategoryImage({ category }: { category: IAdminCategory }) {
  return (
    <div className="admin-category-image">
      {category.imageUrl ? (
        <DeferredImage
          alt={`Vista previa de ${category.name}`}
          className="admin-category-image__asset"
          fallbackAlt="Imagen no disponible"
          height={120}
          src={category.imageUrl}
          width={120}
        />
      ) : (
        <div className="admin-category-image__placeholder" aria-label="Imagen pendiente">
          <span aria-hidden="true">{category.name.charAt(0).toUpperCase()}</span>
        </div>
      )}
    </div>
  )
}

function AdminCategoryActions({
  category,
  isDeleteLoading,
  isPending,
  onDeleteRequest,
}: {
  category: IAdminCategory
  isDeleteLoading: boolean
  isPending: boolean
  onDeleteRequest: (category: IAdminCategory) => void
}) {
  const canDelete = category.productCount === 0

  return (
    <div className="admin-category-actions">
      <Link
        aria-label={`Editar ${category.name}`}
        className="admin-category-actions__edit"
        to={routes.adminCategoryEdit(category.id)}
      >
        <Pencil aria-hidden="true" size={17} />
        Editar
      </Link>
      <Button
        aria-label={canDelete
          ? `Eliminar ${category.name}`
          : `${category.name} no puede eliminarse porque tiene productos asociados`}
        className="admin-category-actions__delete"
        disabled={isPending || !canDelete}
        isLoading={isDeleteLoading}
        loadingText="Eliminando…"
        onClick={() => onDeleteRequest(category)}
        title={canDelete ? undefined : 'Reasigná sus productos antes de eliminarla'}
        variant="ghost"
      >
        <Trash2 aria-hidden="true" size={17} />
        Eliminar
      </Button>
    </div>
  )
}

function AdminCategoryCard({
  category,
  isDeleteLoading,
  isPending,
  onDeleteRequest,
  onPublicationChange,
}: {
  category: IAdminCategory
  isDeleteLoading: boolean
  isPending: boolean
  onDeleteRequest: (category: IAdminCategory) => void
  onPublicationChange: (category: IAdminCategory, value: boolean) => void
}) {
  return (
    <article className="admin-category-card">
      <div className="admin-category-card__media">
        <AdminCategoryImage category={category} />
      </div>
      <div className="admin-category-card__body">
        <div className="admin-category-card__main">
          <h3 className="admin-category-card__name">{category.name}</h3>
          <div className="admin-category-card__meta">
            <AdminCategoryAreaChip area={category.catalogArea} />
            <span className="admin-category-card__count">{formatProductCount(category.productCount)}</span>
          </div>
        </div>

        <div className="admin-category-card__status">
          <Switch
            aria-label={`${category.isActive ? 'Ocultar' : 'Mostrar'} ${category.name} en la tienda`}
            checked={category.isActive}
            disabled={isPending}
            label={category.isActive ? 'Visible en la tienda' : 'Oculta'}
            onChange={(event) => onPublicationChange(category, event.target.checked)}
          />
        </div>

        <div className="admin-category-card__actions">
          <AdminCategoryActions
            category={category}
            isDeleteLoading={isDeleteLoading}
            isPending={isPending}
            onDeleteRequest={onDeleteRequest}
          />
        </div>
      </div>
    </article>
  )
}

function AdminCategoryHorizontalCard({
  category,
  isDeleteLoading,
  isPending,
  onDeleteRequest,
  onPublicationChange,
}: {
  category: IAdminCategory
  isDeleteLoading: boolean
  isPending: boolean
  onDeleteRequest: (category: IAdminCategory) => void
  onPublicationChange: (category: IAdminCategory, value: boolean) => void
}) {
  return (
    <article className="admin-category-horizontal-card">
      <div className="admin-category-horizontal-card__media">
        <AdminCategoryImage category={category} />
      </div>

      <div className="admin-category-horizontal-card__content">
        <div className="admin-category-horizontal-card__main">
          <h3 className="admin-category-horizontal-card__name">{category.name}</h3>
          <div className="admin-category-horizontal-card__meta">
            <AdminCategoryAreaChip area={category.catalogArea} />
            <span className="admin-category-horizontal-card__count">
              {formatProductCount(category.productCount)}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-category-horizontal-card__aside">
        <div className="admin-category-horizontal-card__visibility">
          <p className="admin-category-horizontal-card__visibility-label">Visible en la tienda</p>
          <Switch
            aria-label={`${category.isActive ? 'Ocultar' : 'Mostrar'} ${category.name} en la tienda`}
            checked={category.isActive}
            className="admin-category-horizontal-card__visibility-switch"
            disabled={isPending}
            label={category.isActive ? 'Visible' : 'Oculta'}
            onChange={(event) => onPublicationChange(category, event.target.checked)}
          />
        </div>

        <div className="admin-category-horizontal-card__actions">
          <AdminCategoryActions
            category={category}
            isDeleteLoading={isDeleteLoading}
            isPending={isPending}
            onDeleteRequest={onDeleteRequest}
          />
        </div>
      </div>
    </article>
  )
}

export function AdminCategoryTable({
  categories,
  onDeleteRequest,
  onPublicationChange,
  pendingAction,
  pendingCategoryId,
}: IAdminCategoryTableProps) {
  const layout = useAdminCategoryListLayout()

  if (layout === 'mobile') {
    return (
      <div className="admin-category-cards" role="region" aria-label="Listado de categorías">
        {categories.map((category) => {
          const isPending = pendingCategoryId === category.id
          const isDeleteLoading = isPending && pendingAction === 'delete'

          return (
            <AdminCategoryCard
              key={category.id}
              category={category}
              isDeleteLoading={isDeleteLoading}
              isPending={isPending}
              onDeleteRequest={onDeleteRequest}
              onPublicationChange={onPublicationChange}
            />
          )
        })}
      </div>
    )
  }

  if (layout === 'card') {
    return (
      <ul className="admin-category-horizontal-cards" role="list" aria-label="Listado de categorías">
        {categories.map((category) => {
          const isPending = pendingCategoryId === category.id
          const isDeleteLoading = isPending && pendingAction === 'delete'

          return (
            <li key={category.id}>
              <AdminCategoryHorizontalCard
                category={category}
                isDeleteLoading={isDeleteLoading}
                isPending={isPending}
                onDeleteRequest={onDeleteRequest}
                onPublicationChange={onPublicationChange}
              />
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="admin-category-table" role="region" aria-label="Listado de categorías">
      <table>
        <thead>
          <tr>
            <th scope="col">Categoría</th>
            <th scope="col">Área</th>
            <th scope="col">Productos</th>
            <th scope="col">Visible en la tienda</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const isPending = pendingCategoryId === category.id
            const isDeleteLoading = isPending && pendingAction === 'delete'

            return (
              <tr key={category.id}>
                <td data-label="Categoría">
                  <div className="admin-category-table__identity">
                    <AdminCategoryImage category={category} />
                    <div>
                      <strong>{category.name}</strong>
                    </div>
                  </div>
                </td>
                <td data-label="Área">
                  <AdminCategoryAreaChip area={category.catalogArea} />
                </td>
                <td data-label="Productos">
                  <span className="admin-category-table__count">{formatProductCount(category.productCount)}</span>
                </td>
                <td data-label="Visible">
                  <Switch
                    aria-label={`${category.isActive ? 'Ocultar' : 'Mostrar'} ${category.name} en la tienda`}
                    checked={category.isActive}
                    disabled={isPending}
                    label={category.isActive ? 'Visible' : 'Oculta'}
                    onChange={(event) => onPublicationChange(category, event.target.checked)}
                  />
                </td>
                <td data-label="Acciones">
                  <AdminCategoryActions
                    category={category}
                    isDeleteLoading={isDeleteLoading}
                    isPending={isPending}
                    onDeleteRequest={onDeleteRequest}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
