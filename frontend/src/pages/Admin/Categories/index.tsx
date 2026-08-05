import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, Shapes, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { routes } from '@/config/routes'
import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  AdminCategoryFilters,
  AdminCategoryTable,
  AdminCategoryTableSkeleton,
  buildAdminCategorySearchParams,
  DEFAULT_ADMIN_CATEGORY_FILTERS,
  getAdminCategoryLifecycleErrorMessage,
  getAdminCategoryLifecycleSuccessMessage,
  parseAdminCategoryFilters,
  useAdminCategories,
  useAdminCategoryLifecycle,
} from '@/features/admin-categories'
import type {
  AdminCategoryFiltersFormType,
  IAdminCategory,
  IAdminCategoryFilters,
} from '@/features/admin-categories'
import { Button, EmptyState, Modal, Pagination } from '@/shared/components'
import { getApiErrorCode, getApiErrorStatus } from '@/shared/services/api/errors'

import '@/features/admin-categories/admin-categories.css'

export function AdminCategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<IAdminCategory | null>(null)
  const filters = useMemo(() => parseAdminCategoryFilters(searchParams), [searchParams])
  const categories = useAdminCategories(filters)
  const lifecycle = useAdminCategoryLifecycle()
  useRefreshAdminSessionOnUnauthorized(categories.error)
  useRefreshAdminSessionOnUnauthorized(lifecycle.error)

  useEffect(() => {
    document.title = 'Categorías | Margarita Arte & Deco'
    return () => { document.title = 'Margarita Arte & Deco' }
  }, [])

  useEffect(() => {
    const totalPages = categories.data?.pagination.totalPages ?? 0
    if (totalPages > 0 && filters.page > totalPages) {
      setSearchParams(buildAdminCategorySearchParams({ ...filters, page: totalPages }), {
        replace: true,
      })
    }
  }, [categories.data?.pagination.totalPages, filters, setSearchParams])

  function updateFilters(next: IAdminCategoryFilters) {
    setSearchParams(buildAdminCategorySearchParams(next))
  }

  function handleApply(values: AdminCategoryFiltersFormType) {
    const search = values.search.trim()
    updateFilters({
      area: values.area,
      page: 1,
      pageSize: Number(values.pageSize),
      publication: values.publication,
      ...(search ? { search } : {}),
      sort: values.sort,
    })
  }

  async function handlePublication(category: IAdminCategory, value: boolean) {
    setFeedback(null)
    try {
      await lifecycle.mutateAsync({ action: 'publication', category, value })
      setFeedback({
        message: getAdminCategoryLifecycleSuccessMessage(category.name, 'publication', value),
        type: 'success',
      })
    } catch (error) {
      const code = getApiErrorCode(error)
      setFeedback({ message: getAdminCategoryLifecycleErrorMessage(code), type: 'error' })
      if (code === 'CATEGORY_UPDATE_CONFLICT') void categories.refetch()
    }
  }

  async function handleDeleteConfirm() {
    if (categoryToDelete === null) return
    setFeedback(null)
    try {
      await lifecycle.mutateAsync({ action: 'delete', category: categoryToDelete })
      setFeedback({
        message: getAdminCategoryLifecycleSuccessMessage(categoryToDelete.name, 'delete'),
        type: 'success',
      })
      setCategoryToDelete(null)
    } catch (error) {
      const code = getApiErrorCode(error)
      setFeedback({ message: getAdminCategoryLifecycleErrorMessage(code), type: 'error' })
      if (code === 'CATEGORY_UPDATE_CONFLICT') void categories.refetch()
    }
  }

  const hasFilters = Boolean(
    filters.search || filters.area !== 'all' || filters.publication !== 'all',
  )
  const pagination = categories.data?.pagination
  const pendingCategoryId = lifecycle.isPending ? lifecycle.variables.category.id : null
  const pendingAction = lifecycle.isPending ? lifecycle.variables.action : null

  return (
    <main className="admin-page admin-categories" aria-labelledby="admin-categories-title">
      <AdminPageHeader
        actions={(
          <Link className="ui-button ui-button--primary" to={routes.adminCategoryNew}>
            Nueva categoría
          </Link>
        )}
        currentLabel="Categorías"
        description="Organizá las categorías del catálogo y controlá qué se muestra en la tienda."
        sectionLabel="Gestión"
        title="Categorías"
        titleId="admin-categories-title"
      />

      {feedback ? (
        <div className={`admin-categories__feedback admin-categories__feedback--${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.type === 'success'
            ? <CircleCheck aria-hidden="true" size={22} />
            : <CircleAlert aria-hidden="true" size={22} />}
          <p>{feedback.message}</p>
        </div>
      ) : null}

      <section aria-labelledby="admin-category-filters-title" className="admin-categories__filters-panel">
        <div className="admin-categories__section-heading">
          <div>
            <p className="admin-categories__section-label">Catálogo</p>
            <h2 id="admin-category-filters-title">Buscar y filtrar</h2>
          </div>
          <p>Buscar por nombre y filtrar las categorías que se muestran en la tienda.</p>
        </div>
        <AdminCategoryFilters
          filters={filters}
          onApply={handleApply}
          onClear={() => updateFilters(DEFAULT_ADMIN_CATEGORY_FILTERS)}
        />
      </section>

      <section aria-labelledby="admin-category-list-title" className="admin-categories__list-panel">
        <div className="admin-categories__list-heading">
          <div>
            <p className="admin-categories__section-label">Categorías encontradas</p>
            <h2 id="admin-category-list-title">Listado de categorías</h2>
          </div>
          {pagination ? (
            <p aria-live="polite" className="admin-categories__result-count">
              {pagination.totalItems} {pagination.totalItems === 1 ? 'categoría' : 'categorías'}
              {categories.isFetching && !categories.isPending ? ' · Actualizando…' : ''}
            </p>
          ) : null}
        </div>

        {categories.isPending ? <AdminCategoryTableSkeleton /> : null}
        {categories.isError && getApiErrorStatus(categories.error) !== 401 ? (
          <div className="admin-categories__error" role="alert">
            <CircleAlert aria-hidden="true" size={28} />
            <div>
              <h2>No pudimos cargar las categorías</h2>
              <p>Revisá que el backend esté disponible e intentá nuevamente.</p>
            </div>
            <Button onClick={() => void categories.refetch()} variant="secondary">Reintentar</Button>
          </div>
        ) : null}

        {categories.data?.items.length ? (
          <>
            <AdminCategoryTable
              categories={categories.data.items}
              onDeleteRequest={setCategoryToDelete}
              onPublicationChange={(category, value) => void handlePublication(category, value)}
              pendingAction={pendingAction}
              pendingCategoryId={pendingCategoryId}
            />
            {pagination && pagination.totalPages > 1 ? (
              <Pagination
                {...pagination}
                ariaLabel="Paginación de categorías"
                onPageChange={(page) => updateFilters({ ...filters, page })}
              />
            ) : null}
          </>
        ) : null}

        {categories.data && categories.data.items.length === 0 ? (
          <EmptyState
            action={hasFilters ? (
              <Button onClick={() => updateFilters(DEFAULT_ADMIN_CATEGORY_FILTERS)} variant="secondary">
                Limpiar filtros
              </Button>
            ) : undefined}
            description={hasFilters
              ? 'Probá con otros términos o eliminá alguno de los filtros.'
              : 'Creá la primera categoría para organizar el catálogo.'}
            icon={<Shapes size={34} />}
            title={hasFilters ? 'No encontramos coincidencias' : 'Todavía no hay categorías'}
          />
        ) : null}
      </section>

      <Modal
        className="admin-categories__delete-dialog"
        footer={(
          <div className="admin-categories__delete-actions">
            <Button disabled={lifecycle.isPending} onClick={() => setCategoryToDelete(null)} variant="secondary">Cancelar</Button>
            <Button
              className="admin-categories__confirm-delete"
              isLoading={lifecycle.isPending && lifecycle.variables.action === 'delete'}
              loadingText="Eliminando…"
              onClick={() => void handleDeleteConfirm()}
            >
              <Trash2 aria-hidden="true" size={18} />
              Eliminar categoría
            </Button>
          </div>
        )}
        isOpen={categoryToDelete !== null}
        onClose={() => { if (!lifecycle.isPending) setCategoryToDelete(null) }}
        title="Eliminar categoría"
      >
        <div className="admin-categories__delete-copy">
          <p>Vas a quitar <strong>{categoryToDelete?.name}</strong> del panel y del catálogo.</p>
          <p>La imagen se conservará para una futura restauración. Esta acción solo está disponible sin productos asociados.</p>
        </div>
      </Modal>
    </main>
  )
}
