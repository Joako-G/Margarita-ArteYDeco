import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, Users } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  AdminCustomerFilters,
  AdminCustomerTable,
  AdminCustomerTableSkeleton,
  buildAdminCustomerSearchParams,
  DEFAULT_ADMIN_CUSTOMER_FILTERS,
  parseAdminCustomerFilters,
  useAdminCustomers,
} from '@/features/admin-customers'
import type {
  AdminCustomerFiltersFormType,
  IAdminCustomerFilters,
} from '@/features/admin-customers'
import { Button, EmptyState, Pagination } from '@/shared/components'
import { getApiErrorStatus } from '@/shared/services/api/errors'

import '@/features/admin-customers/admin-customers.css'

export function AdminCustomersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [feedback] = useState(() => {
    const state = location.state as { feedback?: unknown } | null
    return typeof state?.feedback === 'string' ? state.feedback : null
  })
  const filters = useMemo(() => parseAdminCustomerFilters(searchParams), [searchParams])
  const customers = useAdminCustomers(filters)
  useRefreshAdminSessionOnUnauthorized(customers.error)

  useEffect(() => {
    document.title = 'Clientes | Margaritas Arte & Deco'
    return () => { document.title = 'Margaritas Arte & Deco' }
  }, [])

  useEffect(() => {
    if (!feedback || location.state === null) return
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [feedback, location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    const totalPages = customers.data?.pagination.totalPages ?? 0
    if (totalPages > 0 && filters.page > totalPages) {
      setSearchParams(buildAdminCustomerSearchParams({ ...filters, page: totalPages }), {
        replace: true,
      })
    }
  }, [customers.data?.pagination.totalPages, filters, setSearchParams])

  function updateFilters(next: IAdminCustomerFilters) {
    setSearchParams(buildAdminCustomerSearchParams(next))
  }

  function handleApply(values: AdminCustomerFiltersFormType) {
    const search = values.search.trim()
    updateFilters({
      page: 1,
      pageSize: Number(values.pageSize),
      ...(search ? { search } : {}),
      sort: values.sort,
    })
  }

  const pagination = customers.data?.pagination

  return (
    <main aria-labelledby="admin-customers-title" className="admin-page admin-customers">
      <AdminPageHeader
        currentLabel="Clientes"
        description="Consultá datos de contacto e historial de compras sin alterar los pedidos anteriores."
        sectionLabel="Gestión"
        title="Clientes"
        titleId="admin-customers-title"
      />

      {feedback ? (
        <div className="admin-customers__feedback" role="status">
          <CircleCheck aria-hidden="true" size={22} />
          <p>{feedback}</p>
        </div>
      ) : null}

      <section aria-labelledby="admin-customer-filters-title" className="admin-customers__filters-panel">
        <div className="admin-customers__section-heading">
          <div>
            <p className="admin-customers__section-label">Directorio</p>
            <h2 id="admin-customer-filters-title">Buscar y ordenar</h2>
          </div>
          <p>Los clientes se crean automáticamente al confirmar su primera compra.</p>
        </div>
        <AdminCustomerFilters
          filters={filters}
          onApply={handleApply}
          onClear={() => updateFilters(DEFAULT_ADMIN_CUSTOMER_FILTERS)}
        />
      </section>

      <section aria-labelledby="admin-customer-list-title" className="admin-customers__list-panel">
        <div className="admin-customers__list-heading">
          <div>
            <p className="admin-customers__section-label">Resultados</p>
            <h2 id="admin-customer-list-title">Listado de clientes</h2>
          </div>
          {pagination ? (
            <p aria-live="polite" className="admin-customers__result-count">
              {pagination.totalItems} {pagination.totalItems === 1 ? 'cliente' : 'clientes'}
              {customers.isFetching && !customers.isPending ? ' · Actualizando…' : ''}
            </p>
          ) : null}
        </div>

        {customers.isPending ? <AdminCustomerTableSkeleton /> : null}
        {customers.isError && getApiErrorStatus(customers.error) !== 401 ? (
          <div className="admin-customers__error" role="alert">
            <CircleAlert aria-hidden="true" size={28} />
            <div>
              <h2>No pudimos cargar los clientes</h2>
              <p>Revisá que el backend esté disponible e intentá nuevamente.</p>
            </div>
            <Button onClick={() => void customers.refetch()} variant="secondary">Reintentar</Button>
          </div>
        ) : null}

        {customers.data?.items.length ? (
          <>
            <AdminCustomerTable customers={customers.data.items} />
            {pagination && pagination.totalPages > 1 ? (
              <Pagination
                {...pagination}
                ariaLabel="Paginación de clientes"
                onPageChange={(page) => updateFilters({ ...filters, page })}
              />
            ) : null}
          </>
        ) : null}

        {customers.data && customers.data.items.length === 0 ? (
          <EmptyState
            action={filters.search ? (
              <Button onClick={() => updateFilters(DEFAULT_ADMIN_CUSTOMER_FILTERS)} variant="secondary">
                Limpiar búsqueda
              </Button>
            ) : undefined}
            description={filters.search
              ? 'Probá con otro nombre, apellido o celular.'
              : 'Los clientes aparecerán aquí después de su primera compra.'}
            icon={<Users size={34} />}
            title={filters.search ? 'No encontramos coincidencias' : 'Todavía no hay clientes'}
          />
        ) : null}
      </section>
    </main>
  )
}
