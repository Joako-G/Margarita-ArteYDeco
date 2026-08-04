import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, PackageSearch, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { routes } from '@/config/routes'

import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  AdminProductFilters,
  AdminProductTable,
  AdminProductTableSkeleton,
  buildAdminProductSearchParams,
  DEFAULT_ADMIN_PRODUCT_FILTERS,
  getAdminProductLifecycleErrorMessage,
  getAdminProductLifecycleSuccessMessage,
  parseAdminProductFilters,
  useAdminProductLifecycle,
  useAdminProducts,
} from '@/features/admin-products'
import type {
  AdminProductFiltersFormType,
  IAdminProduct,
  IAdminProductFilters,
} from '@/features/admin-products'
import { Button, EmptyState, Modal, Pagination } from '@/shared/components'
import { getApiErrorCode, getApiErrorStatus } from '@/shared/services/api/errors'

import '@/features/admin-products/admin-products.css'

export function AdminProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [feedback, setFeedback] = useState<{
    message: string
    type: 'error' | 'success'
  } | null>(null)
  const [productToDelete, setProductToDelete] = useState<IAdminProduct | null>(null)
  const filters = useMemo(() => parseAdminProductFilters(searchParams), [searchParams])
  const products = useAdminProducts(filters)
  const lifecycle = useAdminProductLifecycle()
  useRefreshAdminSessionOnUnauthorized(products.error)
  useRefreshAdminSessionOnUnauthorized(lifecycle.error)

  useEffect(() => {
    document.title = 'Productos | Margarita Arte & Deco'

    return () => {
      document.title = 'Margarita Arte & Deco'
    }
  }, [])

  useEffect(() => {
    const totalPages = products.data?.pagination.totalPages ?? 0

    if (totalPages > 0 && filters.page > totalPages) {
      setSearchParams(buildAdminProductSearchParams({ ...filters, page: totalPages }), {
        replace: true,
      })
    }
  }, [filters, products.data?.pagination.totalPages, setSearchParams])

  function updateFilters(nextFilters: IAdminProductFilters) {
    setSearchParams(buildAdminProductSearchParams(nextFilters))
  }

  function handleApply(values: AdminProductFiltersFormType) {
    const search = values.search.trim()

    updateFilters({
      page: 1,
      pageSize: Number(values.pageSize),
      publication: values.publication,
      ...(search ? { search } : {}),
      sort: values.sort,
      stock: values.stock,
    })
  }

  async function runLifecycleChange(
    input:
      | { action: 'featured'; product: IAdminProduct; value: boolean }
      | { action: 'publication'; product: IAdminProduct; value: boolean },
  ) {
    setFeedback(null)

    try {
      await lifecycle.mutateAsync(input)
      setFeedback({
        message: getAdminProductLifecycleSuccessMessage(
          input.product.name,
          input.action,
          input.value,
        ),
        type: 'success',
      })
    } catch (error) {
      const errorCode = getApiErrorCode(error)
      setFeedback({
        message: getAdminProductLifecycleErrorMessage(errorCode),
        type: 'error',
      })
      if (errorCode === 'PRODUCT_UPDATE_CONFLICT') void products.refetch()
    }
  }

  async function handleDeleteConfirm() {
    if (productToDelete === null) return

    setFeedback(null)

    try {
      await lifecycle.mutateAsync({ action: 'delete', product: productToDelete })
      setFeedback({
        message: getAdminProductLifecycleSuccessMessage(productToDelete.name, 'delete'),
        type: 'success',
      })
      setProductToDelete(null)
    } catch (error) {
      const errorCode = getApiErrorCode(error)
      setFeedback({
        message: getAdminProductLifecycleErrorMessage(errorCode),
        type: 'error',
      })
      if (errorCode === 'PRODUCT_UPDATE_CONFLICT') void products.refetch()
    }
  }

  const hasCatalogFilters = Boolean(
    filters.search || filters.publication !== 'all' || filters.stock !== 'all',
  )
  const pagination = products.data?.pagination
  const pendingAction = lifecycle.isPending ? lifecycle.variables.action : null
  const pendingProductId = lifecycle.isPending ? lifecycle.variables.product.id : null

  return (
    <main className="admin-page admin-products" aria-labelledby="admin-products-title">
      <AdminPageHeader
        actions={(
          <Link className="ui-button ui-button--primary" to={routes.adminProductNew}>
            Nuevo producto
          </Link>
        )}
        currentLabel="Productos"
        description="Consultá el catálogo, su publicación y el estado actual del inventario."
        sectionLabel="Gestión"
        title="Productos"
        titleId="admin-products-title"
      />

      {feedback ? (
        <div
          className={`admin-products__feedback admin-products__feedback--${feedback.type}`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.type === 'success' ? (
            <CircleCheck aria-hidden="true" size={22} />
          ) : (
            <CircleAlert aria-hidden="true" size={22} />
          )}
          <p>{feedback.message}</p>
        </div>
      ) : null}

      <section
        aria-labelledby="admin-product-filters-title"
        className="admin-products__filters-panel"
      >
        <div className="admin-products__section-heading">
          <div>
            <p className="admin-products__section-label">Catálogo</p>
            <h2 id="admin-product-filters-title">Buscar y filtrar</h2>
          </div>
          <p>Combiná los filtros para encontrar productos rápidamente.</p>
        </div>
        <AdminProductFilters
          filters={filters}
          onApply={handleApply}
          onClear={() => updateFilters(DEFAULT_ADMIN_PRODUCT_FILTERS)}
        />
      </section>

      <section aria-labelledby="admin-product-list-title" className="admin-products__list-panel">
        <div className="admin-products__list-heading">
          <div>
            <p className="admin-products__section-label">Resultados</p>
            <h2 id="admin-product-list-title">Listado de productos</h2>
          </div>
          {pagination ? (
            <p aria-live="polite" className="admin-products__result-count">
              {pagination.totalItems} {pagination.totalItems === 1 ? 'producto' : 'productos'}
              {products.isFetching && !products.isPending ? ' · Actualizando…' : ''}
            </p>
          ) : null}
        </div>

        {products.isPending ? <AdminProductTableSkeleton /> : null}

        {products.isError && getApiErrorStatus(products.error) !== 401 ? (
          <div className="admin-products__error" role="alert">
            <CircleAlert aria-hidden="true" size={28} />
            <div>
              <h2>No pudimos cargar los productos</h2>
              <p>Revisá que el backend esté disponible e intentá nuevamente.</p>
            </div>
            <Button onClick={() => void products.refetch()} variant="secondary">
              Reintentar
            </Button>
          </div>
        ) : null}

        {products.data?.items.length ? (
          <>
            <AdminProductTable
              onDeleteRequest={setProductToDelete}
              onFeaturedChange={(product, value) => {
                void runLifecycleChange({ action: 'featured', product, value })
              }}
              onPublicationChange={(product, value) => {
                void runLifecycleChange({ action: 'publication', product, value })
              }}
              pendingAction={pendingAction}
              pendingProductId={pendingProductId}
              products={products.data.items}
            />
            {pagination && pagination.totalPages > 1 ? (
              <Pagination
                {...pagination}
                ariaLabel="Paginación de productos"
                onPageChange={(page) => updateFilters({ ...filters, page })}
              />
            ) : null}
          </>
        ) : null}

        {products.data && products.data.items.length === 0 ? (
          <EmptyState
            action={
              hasCatalogFilters ? (
                <Button
                  onClick={() => updateFilters(DEFAULT_ADMIN_PRODUCT_FILTERS)}
                  variant="secondary"
                >
                  Limpiar filtros
                </Button>
              ) : undefined
            }
            description={
              hasCatalogFilters
                ? 'Probá con otros términos o eliminá alguno de los filtros aplicados.'
                : 'Cuando haya productos cargados, aparecerán en este listado.'
            }
            icon={<PackageSearch size={34} />}
            title={hasCatalogFilters ? 'No encontramos coincidencias' : 'Todavía no hay productos'}
          />
        ) : null}
      </section>

      <Modal
        className="admin-products__delete-dialog"
        footer={(
          <div className="admin-products__delete-actions">
            <Button
              disabled={lifecycle.isPending}
              onClick={() => setProductToDelete(null)}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              className="admin-products__confirm-delete"
              isLoading={lifecycle.isPending && lifecycle.variables.action === 'delete'}
              loadingText="Eliminando…"
              onClick={() => void handleDeleteConfirm()}
            >
              <Trash2 aria-hidden="true" size={18} />
              Eliminar producto
            </Button>
          </div>
        )}
        isOpen={productToDelete !== null}
        onClose={() => {
          if (!lifecycle.isPending) setProductToDelete(null)
        }}
        title="Eliminar producto"
      >
        <div className="admin-products__delete-copy">
          <p>
            Vas a quitar <strong>{productToDelete?.name}</strong> del panel y del catálogo.
          </p>
          <p>
            Se conservarán su stock, imagen e historial de ventas para una futura restauración.
          </p>
        </div>
      </Modal>
    </main>
  )
}
