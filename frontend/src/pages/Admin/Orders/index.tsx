import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, ClipboardList, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'

import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  AdminOrderFilters,
  AdminOrderTable,
  AdminOrderTableSkeleton,
  buildAdminOrderSearchParams,
  DEFAULT_ADMIN_ORDER_FILTERS,
  adminOrdersService,
  parseAdminOrderFilters,
  useAdminPaymentReconciliation,
  useAdminOrders,
} from '@/features/admin-orders'
import type {
  AdminOrderFiltersFormType,
  AdminPaymentReconciliationStatusType,
  IAdminOrderFilters,
  IAdminPaymentAttempt,
} from '@/features/admin-orders'
import { Badge, Button, EmptyState, Modal, Pagination } from '@/shared/components'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiErrorStatus } from '@/shared/services/api/errors'
import { formatAdminDate } from '@/shared/utils/format-admin-date'

import '@/features/admin-orders/admin-orders.css'

const RECONCILIATION_STATUS_LABELS: Record<AdminPaymentReconciliationStatusType, string> = {
  approved: 'Aprobado',
  cancelled: 'Cancelado',
  dead_letter: 'Revisión requerida',
  expired: 'Vencido',
  manual_review: 'Revisión manual',
  pending: 'Pendiente',
  rejected: 'Rechazado',
}

const RECONCILIATION_STATUS_VARIANTS: Record<
  AdminPaymentReconciliationStatusType,
  'error' | 'success' | 'warning' | 'neutral'
> = {
  approved: 'success',
  cancelled: 'neutral',
  dead_letter: 'error',
  expired: 'warning',
  manual_review: 'warning',
  pending: 'neutral',
  rejected: 'error',
}

function formatReconciliationDate(value: string | null) {
  if (!value) return 'Sin registrar'
  return formatAdminDate(value)
}

function formatReconciliationAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount)
}

interface IReconciliationAttemptProps {
  attempt: IAdminPaymentAttempt
  isActionPending: boolean
  onAction: (attempt: IAdminPaymentAttempt, action: 'retry' | 'sync') => void
  onReview: (attempt: IAdminPaymentAttempt) => void
}

function ReconciliationAttempt({ attempt, isActionPending, onAction, onReview }: IReconciliationAttemptProps) {
  return (
    <article className="admin-orders__reconciliation-attempt">
      <div className="admin-orders__reconciliation-heading">
        <div>
          <p className="admin-orders__reconciliation-order">Pedido {attempt.orderNumber}</p>
          <h3>Intento interno {attempt.attemptNumber}</h3>
        </div>
        <Badge variant={RECONCILIATION_STATUS_VARIANTS[attempt.status]}>
          {RECONCILIATION_STATUS_LABELS[attempt.status]}
        </Badge>
      </div>
      <dl className="admin-orders__reconciliation-data">
        <div><dt>Proveedor</dt><dd>{attempt.providerStatus ?? 'Sin actualización'}</dd></div>
        <div><dt>Última actualización</dt><dd>{formatReconciliationDate(attempt.providerUpdatedAt)}</dd></div>
        <div><dt>Vencimiento de reserva</dt><dd>{formatReconciliationDate(attempt.reservationExpiresAt)}</dd></div>
        <div><dt>Transacciones Mercado Pago</dt><dd className="admin-orders__tabular">{attempt.transactions.length}</dd></div>
      </dl>
      <section aria-label="Transacciones de Mercado Pago" className="admin-orders__reconciliation-transactions">
        <h4>Transacciones de Mercado Pago</h4>
        {attempt.transactions.length > 0 ? (
          <ul>
            {attempt.transactions.map((transaction) => (
              <li key={transaction.id}>
                <div>
                  <strong>{transaction.providerStatus ?? RECONCILIATION_STATUS_LABELS[transaction.status]}</strong>
                  <span>{formatReconciliationAmount(transaction.amount, transaction.currency)} · ID {transaction.providerPaymentId}</span>
                </div>
                <div>
                  <span>{formatReconciliationDate(transaction.providerUpdatedAt ?? transaction.updatedAt)}</span>
                  {transaction.reviewRequired ? <Badge variant="warning">Revisión</Badge> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : <p>No hay transacciones del proveedor registradas.</p>}
      </section>
      {attempt.lastError ? <p className="admin-orders__reconciliation-error">{attempt.lastError}</p> : null}
      <details className="admin-orders__reconciliation-timeline">
        <summary><Search aria-hidden="true" size={16} /> Ver línea de auditoría</summary>
        <ol>
          {attempt.auditTimeline.length > 0 ? attempt.auditTimeline.map((event) => (
              <li key={`${event.createdAt}-${event.type}`}>
                <strong>{event.description}</strong>
                <span>{event.actor} · {formatReconciliationDate(event.createdAt)}</span>
              </li>
            )) : (
              <li className="admin-orders__reconciliation-timeline-empty">
                No hay eventos de auditoría registrados para este intento.
              </li>
            )}
        </ol>
      </details>
      <div className="admin-orders__reconciliation-actions">
        {attempt.canSync ? (
          <Button disabled={isActionPending} onClick={() => onAction(attempt, 'sync')} variant="secondary">
            <RefreshCw aria-hidden="true" size={17} /> Sincronizar
          </Button>
        ) : null}
        {attempt.canRetry ? (
          <Button disabled={isActionPending} onClick={() => onAction(attempt, 'retry')} variant="secondary">
            Reintentar dentro de la política
          </Button>
        ) : null}
        {attempt.canReview ? (
          <Button onClick={() => onReview(attempt)} variant="ghost">Registrar revisión</Button>
        ) : null}
      </div>
    </article>
  )
}

function AdminPaymentReconciliationView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [reviewAttempt, setReviewAttempt] = useState<IAdminPaymentAttempt | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const queryClient = useQueryClient()
  const filters = {
    page: Number(searchParams.get('page') ?? '1') || 1,
    pageSize: 10,
    status: (searchParams.get('status') as AdminPaymentReconciliationStatusType | null) ?? 'all',
  } as const
  const reconciliation = useAdminPaymentReconciliation(filters)
  const action = useMutation({
    mutationFn: ({ attemptId, type }: { attemptId: string; type: 'retry' | 'sync' }) =>
      adminOrdersService.executePaymentAction(attemptId, type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'payment-reconciliation'] }),
  })
  const review = useMutation({
    mutationFn: ({ attemptId, note }: { attemptId: string; note: string }) =>
      adminOrdersService.executePaymentAction(attemptId, 'review', { decision: 'acknowledge', note }),
    onSuccess: () => {
      setReviewAttempt(null)
      setReviewNote('')
      return queryClient.invalidateQueries({ queryKey: ['admin', 'payment-reconciliation'] })
    },
  })

  useEffect(() => {
    document.title = 'Conciliación de pagos | Margaritas Arte & Deco'
    return () => { document.title = 'Margaritas Arte & Deco' }
  }, [])

  function setStatus(status: string) {
    const next = new URLSearchParams(searchParams)
    if (status === 'all') next.delete('status')
    else next.set('status', status)
    next.delete('page')
    setSearchParams(next)
  }

  return (
    <main aria-labelledby="admin-reconciliation-title" className="admin-page admin-orders">
      <AdminPageHeader
        currentLabel="Conciliación de pagos"
        description="Verificá el estado autoritativo de Mercado Pago sin confirmar pagos manualmente."
        sectionLabel="Gestión"
        title="Conciliación de pagos"
        titleId="admin-reconciliation-title"
      />
      <section aria-label="Filtros de conciliación" className="admin-orders__filters-panel admin-orders__reconciliation-filters">
        <label htmlFor="reconciliation-status">Estado</label>
        <select id="reconciliation-status" onChange={(event) => setStatus(event.target.value)} value={filters.status}>
          <option value="all">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="manual_review">Revisión manual</option>
          <option value="dead_letter">Revisión requerida</option>
          <option value="expired">Vencidos</option>
          <option value="rejected">Rechazados</option>
          <option value="approved">Aprobados</option>
        </select>
      </section>
      {reconciliation.isError ? (
        <div className="admin-orders__error" role="alert">
          <ShieldAlert aria-hidden="true" size={28} />
          <p>No pudimos cargar la conciliación. Intentá nuevamente.</p>
          <Button onClick={() => void reconciliation.refetch()} variant="secondary">Reintentar</Button>
        </div>
      ) : null}
      <section aria-live="polite" className="admin-orders__reconciliation-list">
        {reconciliation.isPending ? <p> Cargando conciliación…</p> : null}
        {reconciliation.data?.items.map((attempt) => (
          <ReconciliationAttempt
            attempt={attempt}
            isActionPending={action.isPending}
            key={attempt.id}
            onAction={(selected, type) => action.mutate({ attemptId: selected.id, type })}
            onReview={setReviewAttempt}
          />
        ))}
        {reconciliation.data?.items.length === 0 ? (
          <EmptyState description="No hay pagos que coincidan con el filtro actual." icon={<ClipboardList size={34} />} title="Sin pagos para revisar" />
        ) : null}
        {reconciliation.data && reconciliation.data.pagination.totalPages > 1 ? (
          <Pagination
            {...reconciliation.data.pagination}
            ariaLabel="Paginación de conciliación"
            onPageChange={(page) => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(page))
              setSearchParams(next)
            }}
          />
        ) : null}
      </section>
      <Modal
        isOpen={reviewAttempt !== null}
        onClose={() => { if (!review.isPending) setReviewAttempt(null) }}
        title="Registrar revisión"
        footer={(
          <div className="admin-orders__reconciliation-modal-actions">
            <Button disabled={review.isPending} onClick={() => setReviewAttempt(null)} variant="secondary">Cancelar</Button>
            <Button disabled={!reviewNote.trim()} isLoading={review.isPending} onClick={() => reviewAttempt && review.mutate({ attemptId: reviewAttempt.id, note: reviewNote.trim() })}>Guardar revisión</Button>
          </div>
        )}
      >
        <label htmlFor="reconciliation-review-note">Nota administrativa</label>
        <textarea id="reconciliation-review-note" onChange={(event) => setReviewNote(event.target.value)} value={reviewNote} />
      </Modal>
    </main>
  )
}

function AdminOrdersListView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseAdminOrderFilters(searchParams), [searchParams])
  const orders = useAdminOrders(filters)
  useRefreshAdminSessionOnUnauthorized(orders.error)

  useEffect(() => {
    document.title = 'Pedidos | Margaritas Arte & Deco'
    return () => { document.title = 'Margaritas Arte & Deco' }
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
        description="Consultá ventas, pagos y entregas."
        sectionLabel="Gestión"
        title="Pedidos"
        titleId="admin-orders-title"
      />

      <section aria-labelledby="admin-order-filters-title" className="admin-orders__filters-panel">
        <div className="admin-orders__section-heading">
          <h2 id="admin-order-filters-title">Filtros</h2>
        </div>
        <AdminOrderFilters
          filters={filters}
          onApply={handleApply}
          onClear={() => updateFilters(DEFAULT_ADMIN_ORDER_FILTERS)}
        />
      </section>

      <section aria-labelledby="admin-order-list-title" className="admin-orders__list-panel">
        <div className="admin-orders__list-heading">
          <h2 id="admin-order-list-title">Pedidos</h2>
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
              ? 'Probá con otros filtros.'
              : 'Todavía no hay pedidos.'}
            icon={<ClipboardList size={34} />}
            title={hasFilters ? 'No encontramos coincidencias' : 'Todavía no hay pedidos'}
          />
        ) : null}
      </section>
    </main>
  )
}

export function AdminOrdersPage() {
  const location = useLocation()
  return location.pathname.endsWith('/pagos/reconciliacion')
    ? <AdminPaymentReconciliationView />
    : <AdminOrdersListView />
}
