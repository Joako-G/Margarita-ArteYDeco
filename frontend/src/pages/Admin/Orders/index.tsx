import { useEffect, useMemo } from 'react'
import { CircleAlert, ClipboardList } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  AdminOrderFilters,
  AdminOrderTable,
  AdminOrderTableSkeleton,
  buildAdminOrderSearchParams,
  DEFAULT_ADMIN_ORDER_FILTERS,
  parseAdminOrderFilters,
  useAdminOrders,
} from '@/features/admin-orders'
import type { AdminOrderFiltersFormType, IAdminOrderFilters } from '@/features/admin-orders'
import { Button, EmptyState, Pagination } from '@/shared/components'
import { getApiErrorStatus } from '@/shared/services/api/errors'

import '@/features/admin-orders/admin-orders.css'

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseAdminOrderFilters(searchParams), [searchParams])
  const orders = useAdminOrders(filters)
  useRefreshAdminSessionOnUnauthorized(orders.error)

  useEffect(() => {
    document.title = 'Pedidos | Margarita Arte & Deco'
    return () => { document.title = 'Margarita Arte & Deco' }
  }, [])

  useEffect(() => {
    const totalPages = orders.data?.pagination.totalPages ?? 0
    if (totalPages > 0 && filters.page > totalPages) {
      setSearchParams(buildAdminOrderSearchParams({ ...filters, page: totalPages }), {
        replace: true,
      })
    }
  }, [filters, orders.data?.pagination.totalPages, setSearchParams])

  function updateFilters(next: IAdminOrderFilters) {
    setSearchParams(buildAdminOrderSearchParams(next))
  }

  function handleApply(values: AdminOrderFiltersFormType) {
    const search = values.search.trim()
    updateFilters({
      page: 1,
      pageSize: Number(values.pageSize),
      paymentMethod: values.paymentMethod,
      paymentStatus: values.paymentStatus,
      ...(search ? { search } : {}),
      sort: values.sort,
      status: values.status,
    })
  }

  const hasFilters = Boolean(
    filters.search
      || filters.status !== 'all'
      || filters.paymentMethod !== 'all'
      || filters.paymentStatus !== 'all',
  )
  const pagination = orders.data?.pagination

  return (
    <main aria-labelledby="admin-orders-title" className="admin-page admin-orders">
      <AdminPageHeader
        currentLabel="Pedidos"
        description="Revisá ventas, confirmá pagos y acompañá cada pedido hasta el retiro."
        sectionLabel="Gestión"
        title="Pedidos"
        titleId="admin-orders-title"
      />

      <section aria-labelledby="admin-order-filters-title" className="admin-orders__filters-panel">
        <div className="admin-orders__section-heading">
          <div>
            <p className="admin-orders__section-label">Operación diaria</p>
            <h2 id="admin-order-filters-title">Buscar y filtrar</h2>
          </div>
          <p>Los estados disponibles respetan el método y la confirmación del pago.</p>
        </div>
        <AdminOrderFilters
          filters={filters}
          onApply={handleApply}
          onClear={() => updateFilters(DEFAULT_ADMIN_ORDER_FILTERS)}
        />
      </section>

      <section aria-labelledby="admin-order-list-title" className="admin-orders__list-panel">
        <div className="admin-orders__list-heading">
          <div>
            <p className="admin-orders__section-label">Resultados</p>
            <h2 id="admin-order-list-title">Listado de pedidos</h2>
          </div>
          {pagination ? (
            <p aria-live="polite" className="admin-orders__result-count">
              {pagination.totalItems} {pagination.totalItems === 1 ? 'pedido' : 'pedidos'}
              {orders.isFetching && !orders.isPending ? ' · Actualizando…' : ''}
            </p>
          ) : null}
        </div>

        {orders.isPending ? <AdminOrderTableSkeleton /> : null}
        {orders.isError && getApiErrorStatus(orders.error) !== 401 ? (
          <div className="admin-orders__error" role="alert">
            <CircleAlert aria-hidden="true" size={28} />
            <div>
              <h2>No pudimos cargar los pedidos</h2>
              <p>Revisá que el backend esté disponible e intentá nuevamente.</p>
            </div>
            <Button onClick={() => void orders.refetch()} variant="secondary">Reintentar</Button>
          </div>
        ) : null}

        {orders.data?.items.length ? (
          <>
            <AdminOrderTable orders={orders.data.items} />
            {pagination && pagination.totalPages > 1 ? (
              <Pagination
                {...pagination}
                ariaLabel="Paginación de pedidos"
                onPageChange={(page) => updateFilters({ ...filters, page })}
              />
            ) : null}
          </>
        ) : null}

        {orders.data && orders.data.items.length === 0 ? (
          <EmptyState
            action={hasFilters ? (
              <Button onClick={() => updateFilters(DEFAULT_ADMIN_ORDER_FILTERS)} variant="secondary">
                Limpiar filtros
              </Button>
            ) : undefined}
            description={hasFilters
              ? 'Probá con otros datos o eliminá alguno de los filtros.'
              : 'Los nuevos pedidos aparecerán aquí cuando se confirmen desde la tienda.'}
            icon={<ClipboardList size={34} />}
            title={hasFilters ? 'No encontramos coincidencias' : 'Todavía no hay pedidos'}
          />
        ) : null}
      </section>
    </main>
  )
}
