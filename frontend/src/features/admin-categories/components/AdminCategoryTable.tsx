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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function AdminCategoryTable({
  categories,
  onDeleteRequest,
  onPublicationChange,
  pendingAction,
  pendingCategoryId,
}: IAdminCategoryTableProps) {
  return (
    <div className="admin-category-table" role="region" aria-label="Listado de categorías">
      <table>
        <caption className="sr-only">Categorías del catálogo administrativo</caption>
        <thead>
          <tr>
            <th scope="col">Categoría</th>
            <th scope="col">Área</th>
            <th scope="col">Orden</th>
            <th scope="col">Productos</th>
            <th scope="col">Publicación</th>
            <th scope="col">Actualizada</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const isPending = pendingCategoryId === category.id
            const canDelete = category.productCount === 0

            return (
              <tr key={category.id}>
                <td data-label="Categoría">
                  <div className="admin-category-table__identity">
                    {category.imageUrl ? (
                      <DeferredImage
                        alt={`Vista previa de ${category.name}`}
                        className="admin-category-table__image"
                        height={64}
                        src={category.imageUrl}
                        width={64}
                      />
                    ) : (
                      <div className="admin-category-table__image-placeholder" aria-label="Imagen pendiente">
                        Sin imagen
                      </div>
                    )}
                    <div>
                      <strong>{category.name}</strong>
                      <span>/{category.slug}</span>
                    </div>
                  </div>
                </td>
                <td data-label="Área">
                  <Badge variant="neutral">
                    {category.catalogArea === 'art' ? 'Arte' : 'Decoraciones'}
                  </Badge>
                </td>
                <td data-label="Orden">
                  <strong className="admin-category-table__numeric">{category.displayOrder}</strong>
                </td>
                <td data-label="Productos">
                  <span className="admin-category-table__numeric">{category.productCount}</span>
                </td>
                <td data-label="Publicación">
                  <Switch
                    aria-label={`${category.isActive ? 'Desactivar' : 'Activar'} ${category.name}`}
                    checked={category.isActive}
                    disabled={isPending}
                    label={category.isActive ? 'Activa' : 'Inactiva'}
                    onChange={(event) => onPublicationChange(category, event.target.checked)}
                  />
                </td>
                <td data-label="Actualizada">
                  <time dateTime={category.updatedAt}>{formatDate(category.updatedAt)}</time>
                </td>
                <td data-label="Acciones">
                  <div className="admin-category-table__actions">
                    <Link
                      aria-label={`Editar ${category.name}`}
                      className="admin-category-table__edit"
                      to={routes.adminCategoryEdit(category.id)}
                    >
                      <Pencil aria-hidden="true" size={17} />
                      Editar
                    </Link>
                    <Button
                      aria-label={canDelete
                        ? `Eliminar ${category.name}`
                        : `${category.name} no puede eliminarse porque tiene productos asociados`}
                      disabled={isPending || !canDelete}
                      isLoading={isPending && pendingAction === 'delete'}
                      loadingText="Eliminando…"
                      onClick={() => onDeleteRequest(category)}
                      size="small"
                      title={canDelete ? undefined : 'Reasigná sus productos antes de eliminarla'}
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
