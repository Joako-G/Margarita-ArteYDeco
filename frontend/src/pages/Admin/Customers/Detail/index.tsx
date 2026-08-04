import { useEffect, useState } from 'react'
import { ArrowLeft, CircleAlert, CircleCheck, Trash2, Users } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { routes } from '@/config/routes'
import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  AdminCustomerForm,
  getAdminCustomerErrorMessage,
  useAdminCustomer,
  useAdminCustomerLifecycle,
} from '@/features/admin-customers'
import type { AdminCustomerFormType, IAdminCustomerDetail } from '@/features/admin-customers'
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_DETAILS } from '@/features/admin-orders'
import { Badge, Button, EmptyState, Modal, Pagination, Skeleton } from '@/shared/components'
import { getApiErrorCode, getApiErrorStatus } from '@/shared/services/api/errors'
import { formatPrice } from '@/shared/utils/format-price'
import { ORDER_STATUS_DETAILS } from '@/shared/utils/order-status'

import '@/features/admin-customers/admin-customer-detail.css'

function parseOrdersPage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1
  return Math.min(Math.max(Number(value), 1), 10_000)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function AdminCustomerDetailSkeleton() {
  return (
    <main aria-label="Cargando detalle del cliente" className="admin-page admin-customer-detail" role="status">
      <Skeleton className="admin-customer-detail__skeleton-title" />
      <div className="admin-customer-detail__skeleton-grid"><Skeleton /><Skeleton /></div>
    </main>
  )
}

interface IAdminCustomerContentProps {
  customer: IAdminCustomerDetail
  onOrdersPageChange: (page: number) => void
}

function AdminCustomerContent({ customer, onOrdersPageChange }: IAdminCustomerContentProps) {
  const navigate = useNavigate()
  const lifecycle = useAdminCustomerLifecycle()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  useRefreshAdminSessionOnUnauthorized(lifecycle.error)

  async function handleUpdate(values: AdminCustomerFormType) {
    setFeedback(null)
    try {
      await lifecycle.mutateAsync({
        action: 'update',
        customerId: customer.id,
        payload: {
          expectedUpdatedAt: customer.updatedAt,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          notes: values.notes.trim() || null,
          phone: values.phone.trim(),
        },
      })
      setFeedback({ message: 'Datos del cliente actualizados.', type: 'success' })
    } catch (error) {
      setFeedback({ message: getAdminCustomerErrorMessage(getApiErrorCode(error)), type: 'error' })
    }
  }

  async function handleDelete() {
    setFeedback(null)
    try {
      await lifecycle.mutateAsync({ action: 'delete', customer })
      navigate(routes.adminCustomers, {
        replace: true,
        state: { feedback: 'Cliente dado de baja. Su historial de pedidos se conservó.' },
      })
    } catch (error) {
      setFeedback({ message: getAdminCustomerErrorMessage(getApiErrorCode(error)), type: 'error' })
      setIsDeleteOpen(false)
    }
  }

  return (
    <main aria-labelledby="admin-customer-title" className="admin-page admin-customer-detail">
      <AdminPageHeader
        actions={(
          <Link className="ui-button ui-button--secondary" to={routes.adminCustomers}>
            <ArrowLeft aria-hidden="true" size={18} />
            Volver a clientes
          </Link>
        )}
        currentLabel={`${customer.firstName} ${customer.lastName}`}
        description={`${customer.orderCount} ${customer.orderCount === 1 ? 'pedido asociado' : 'pedidos asociados'} · Cliente desde ${formatDate(customer.createdAt)}.`}
        sectionLabel="Cliente"
        title={`${customer.firstName} ${customer.lastName}`}
        titleId="admin-customer-title"
      />

      {feedback ? (
        <div className={`admin-customer-detail__feedback admin-customer-detail__feedback--${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.type === 'success'
            ? <CircleCheck aria-hidden="true" size={22} />
            : <CircleAlert aria-hidden="true" size={22} />}
          <p>{feedback.message}</p>
        </div>
      ) : null}

      <section aria-labelledby="customer-data-title" className="admin-customer-detail__panel">
        <div className="admin-customer-detail__panel-heading">
          <div>
            <p className="admin-customer-detail__label">Información actual</p>
            <h2 id="customer-data-title">Datos de contacto</h2>
          </div>
          <p>Los cambios no modifican los snapshots guardados en pedidos anteriores.</p>
        </div>
        <AdminCustomerForm
          customer={customer}
          isSubmitting={lifecycle.isPending && lifecycle.variables.action === 'update'}
          key={customer.updatedAt}
          onSubmit={handleUpdate}
        />
      </section>

      <section aria-labelledby="customer-orders-title" className="admin-customer-detail__panel admin-customer-detail__orders">
        <div className="admin-customer-detail__panel-heading">
          <div>
            <p className="admin-customer-detail__label">Historial comercial</p>
            <h2 id="customer-orders-title">Pedidos</h2>
          </div>
          <p>{customer.orders.pagination.totalItems} en total</p>
        </div>

        {customer.orders.items.length ? (
          <>
            <div aria-label="Historial de pedidos del cliente" className="admin-customer-orders" role="region">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Pedido</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Pago</th>
                    <th scope="col">Total</th>
                    <th scope="col"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.items.map((order) => {
                    const status = ORDER_STATUS_DETAILS[order.status]
                    const payment = PAYMENT_STATUS_DETAILS[order.paymentStatus]
                    return (
                      <tr key={order.id}>
                        <td data-label="Pedido">
                          <strong>{order.orderNumber}</strong>
                          <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
                        </td>
                        <td data-label="Estado"><Badge variant={status.variant}>{status.label}</Badge></td>
                        <td data-label="Pago">
                          <Badge variant={payment.variant}>{payment.label}</Badge>
                          <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
                        </td>
                        <td data-label="Total"><strong>{formatPrice(order.total)}</strong></td>
                        <td data-label="Acciones">
                          <Link to={routes.adminOrderDetail(order.id)}>Ver pedido</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {customer.orders.pagination.totalPages > 1 ? (
              <Pagination
                {...customer.orders.pagination}
                ariaLabel="Paginación del historial de pedidos"
                onPageChange={onOrdersPageChange}
              />
            ) : null}
          </>
        ) : (
          <EmptyState
            description="El historial aparecerá cuando el cliente realice una compra."
            icon={<Users size={32} />}
            title="Todavía no hay pedidos asociados"
          />
        )}
      </section>

      <section aria-labelledby="customer-delete-title" className="admin-customer-detail__danger">
        <div>
          <h2 id="customer-delete-title">Dar de baja al cliente</h2>
          <p>Lo quita de las consultas habituales, pero conserva íntegro su historial comercial.</p>
        </div>
        <Button disabled={lifecycle.isPending} onClick={() => setIsDeleteOpen(true)} variant="ghost">
          <Trash2 aria-hidden="true" size={18} />
          Dar de baja
        </Button>
      </section>

      <Modal
        footer={(
          <div className="admin-customer-detail__modal-actions">
            <Button disabled={lifecycle.isPending} onClick={() => setIsDeleteOpen(false)} variant="secondary">Cancelar</Button>
            <Button isLoading={lifecycle.isPending} loadingText="Dando de baja…" onClick={() => void handleDelete()}>
              <Trash2 aria-hidden="true" size={18} />
              Confirmar baja
            </Button>
          </div>
        )}
        isOpen={isDeleteOpen}
        onClose={() => { if (!lifecycle.isPending) setIsDeleteOpen(false) }}
        title="Dar de baja al cliente"
      >
        <p>
          <strong>{customer.firstName} {customer.lastName}</strong> dejará de aparecer en el directorio.
          Sus {customer.orderCount} {customer.orderCount === 1 ? 'pedido se conservará' : 'pedidos se conservarán'}.
          Si vuelve a comprar con el mismo celular, el registro se restaurará automáticamente.
        </p>
      </Modal>
    </main>
  )
}

export function AdminCustomerDetailPage() {
  const { customerId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const ordersPage = parseOrdersPage(searchParams.get('ordersPage'))
  const customer = useAdminCustomer(customerId, ordersPage)
  useRefreshAdminSessionOnUnauthorized(customer.error)

  useEffect(() => {
    document.title = 'Detalle del cliente | Margarita Arte & Deco'
    return () => { document.title = 'Margarita Arte & Deco' }
  }, [])

  useEffect(() => {
    const totalPages = customer.data?.orders.pagination.totalPages ?? 0
    if (totalPages > 0 && ordersPage > totalPages) {
      const next = new URLSearchParams(searchParams)
      if (totalPages === 1) next.delete('ordersPage')
      else next.set('ordersPage', String(totalPages))
      setSearchParams(next, { replace: true })
    }
  }, [customer.data?.orders.pagination.totalPages, ordersPage, searchParams, setSearchParams])

  if (customer.isPending) return <AdminCustomerDetailSkeleton />
  if (customer.isError && getApiErrorStatus(customer.error) !== 401) {
    return (
      <main className="admin-page admin-customer-detail">
        <div className="admin-customer-detail__load-error" role="alert">
          <CircleAlert aria-hidden="true" size={32} />
          <h1>{getApiErrorStatus(customer.error) === 404 ? 'Cliente no encontrado' : 'No pudimos cargar el cliente'}</h1>
          <p>Volvé al listado o intentá nuevamente.</p>
          <div>
            <Link className="ui-button ui-button--secondary" to={routes.adminCustomers}>Volver a clientes</Link>
            <Button onClick={() => void customer.refetch()}>Reintentar</Button>
          </div>
        </div>
      </main>
    )
  }

  return customer.data ? (
    <AdminCustomerContent
      customer={customer.data}
      onOrdersPageChange={(page) => {
        const next = new URLSearchParams(searchParams)
        if (page === 1) next.delete('ordersPage')
        else next.set('ordersPage', String(page))
        setSearchParams(next)
      }}
    />
  ) : null
}
