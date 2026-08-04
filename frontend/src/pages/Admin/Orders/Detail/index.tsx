import { useEffect, useState } from 'react'
import { ArrowLeft, CircleAlert, CircleCheck, MapPin, PackageCheck, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { routes } from '@/config/routes'
import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  AdminOrderCancellationForm,
  AdminWhatsAppComposer,
  formatAdminOrderDate,
  getAdminOrderErrorMessage,
  ORDER_ACTION_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_DETAILS,
  useAdminOrder,
  useAdminOrderLifecycle,
} from '@/features/admin-orders'
import type {
  AdminOrderActionType,
  AdminOrderCancellationFormType,
  IAdminOrderDetail,
} from '@/features/admin-orders'
import { Badge, Button, Modal, Skeleton } from '@/shared/components'
import { getApiErrorCode, getApiErrorStatus } from '@/shared/services/api/errors'
import { formatPrice } from '@/shared/utils/format-price'
import { ORDER_STATUS_DETAILS } from '@/shared/utils/order-status'

import '@/features/admin-orders/admin-order-detail.css'

function AdminOrderDetailSkeleton() {
  return (
    <main aria-label="Cargando detalle del pedido" className="admin-page admin-order-detail" role="status">
      <Skeleton className="admin-order-detail__skeleton-title" />
      <div className="admin-order-detail__skeleton-grid">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </main>
  )
}

interface IAdminOrderContentProps {
  order: IAdminOrderDetail
}

function AdminOrderContent({ order }: IAdminOrderContentProps) {
  const lifecycle = useAdminOrderLifecycle()
  const [actionToConfirm, setActionToConfirm] = useState<AdminOrderActionType | null>(null)
  const [isCancellationOpen, setIsCancellationOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const status = ORDER_STATUS_DETAILS[order.status]
  const payment = PAYMENT_STATUS_DETAILS[order.paymentStatus]

  useRefreshAdminSessionOnUnauthorized(lifecycle.error)

  async function handleActionConfirm() {
    if (actionToConfirm === null) return
    setFeedback(null)
    try {
      await lifecycle.mutateAsync({ action: 'transition', order, transition: actionToConfirm })
      setFeedback({ message: `${ORDER_ACTION_LABELS[actionToConfirm]}: cambio guardado.`, type: 'success' })
      setActionToConfirm(null)
    } catch (error) {
      setFeedback({ message: getAdminOrderErrorMessage(getApiErrorCode(error)), type: 'error' })
    }
  }

  async function handleCancellation(values: AdminOrderCancellationFormType) {
    setFeedback(null)
    try {
      await lifecycle.mutateAsync({ action: 'cancel', order, ...values })
      setFeedback({
        message: 'Pedido cancelado. El stock se restauró una sola vez.',
        type: 'success',
      })
      setIsCancellationOpen(false)
    } catch (error) {
      setFeedback({ message: getAdminOrderErrorMessage(getApiErrorCode(error)), type: 'error' })
    }
  }

  return (
    <main aria-labelledby="admin-order-title" className="admin-page admin-order-detail">
      <AdminPageHeader
        actions={(
          <Link className="ui-button ui-button--secondary" to={routes.adminOrders}>
            <ArrowLeft aria-hidden="true" size={18} />
            Volver a pedidos
          </Link>
        )}
        currentLabel={order.orderNumber}
        description={`Creado el ${formatAdminOrderDate(order.createdAt)}.`}
        sectionLabel="Pedido"
        title={order.orderNumber}
        titleId="admin-order-title"
      />

      {feedback ? (
        <div className={`admin-order-detail__feedback admin-order-detail__feedback--${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.type === 'success'
            ? <CircleCheck aria-hidden="true" size={22} />
            : <CircleAlert aria-hidden="true" size={22} />}
          <p>{feedback.message}</p>
        </div>
      ) : null}

      <section aria-labelledby="order-operation-title" className="admin-order-detail__operation">
        <div>
          <p className="admin-order-detail__label">Estado operativo</p>
          <h2 id="order-operation-title">Qué sigue</h2>
          <div className="admin-order-detail__badges">
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant={payment.variant}>{payment.label}</Badge>
            <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
          </div>
        </div>
        <div className="admin-order-detail__primary-actions">
          {order.availableActions.map((action) => (
            <Button
              disabled={lifecycle.isPending}
              key={action}
              onClick={() => setActionToConfirm(action)}
            >
              <PackageCheck aria-hidden="true" size={18} />
              {ORDER_ACTION_LABELS[action]}
            </Button>
          ))}
          {order.canCancel ? (
            <Button
              className="admin-order-detail__cancel"
              disabled={lifecycle.isPending}
              onClick={() => setIsCancellationOpen(true)}
              variant="ghost"
            >
              <Trash2 aria-hidden="true" size={18} />
              Cancelar pedido
            </Button>
          ) : null}
        </div>
      </section>

      <div className="admin-order-detail__grid">
        <section aria-labelledby="order-products-title" className="admin-order-detail__panel admin-order-detail__products">
          <div className="admin-order-detail__panel-heading">
            <p className="admin-order-detail__label">Contenido</p>
            <h2 id="order-products-title">Productos</h2>
          </div>
          <div className="admin-order-items">
            {order.items.map((item, index) => (
              <div className="admin-order-items__row" key={`${item.productName}-${index}`}>
                <div>
                  <strong>{item.productName}</strong>
                  <span>{item.quantity} × {formatPrice(item.unitPrice)}</span>
                </div>
                <strong>{formatPrice(item.subtotal)}</strong>
              </div>
            ))}
          </div>
          <dl className="admin-order-totals">
            <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            <div><dt>Descuento</dt><dd>− {formatPrice(order.discount)}</dd></div>
            <div className="admin-order-totals__total"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="order-customer-title" className="admin-order-detail__panel">
          <div className="admin-order-detail__panel-heading">
            <p className="admin-order-detail__label">Contacto</p>
            <h2 id="order-customer-title">Cliente y retiro</h2>
          </div>
          <dl className="admin-order-detail__facts">
            <div><dt>Cliente</dt><dd>{order.customer.firstName} {order.customer.lastName}</dd></div>
            <div><dt>Celular</dt><dd>{order.customer.phone}</dd></div>
            <div><dt>Retiro</dt><dd>{order.business.address}</dd></div>
            <div><dt>Horarios</dt><dd>{order.business.businessHours}</dd></div>
            {order.pickedUpAt ? (
              <div><dt>Retirado</dt><dd>{formatAdminOrderDate(order.pickedUpAt)}</dd></div>
            ) : null}
          </dl>
          <a className="admin-order-detail__maps" href={order.business.mapsUrl} rel="noreferrer" target="_blank">
            <MapPin aria-hidden="true" size={18} />
            Ver ubicación del local
          </a>
          {order.notes ? (
            <div className="admin-order-detail__notes">
              <strong>Observaciones</strong>
              <p>{order.notes}</p>
            </div>
          ) : null}
        </section>
      </div>

      <section aria-labelledby="order-whatsapp-title" className="admin-order-detail__panel">
        <div className="admin-order-detail__panel-heading">
          <p className="admin-order-detail__label">Comunicación manual</p>
          <h2 id="order-whatsapp-title">WhatsApp</h2>
          <p>Editá el mensaje antes de abrir la conversación. Nada se envía automáticamente.</p>
        </div>
        <AdminWhatsAppComposer key={order.updatedAt} order={order} />
      </section>

      <Modal
        isOpen={actionToConfirm !== null}
        onClose={() => { if (!lifecycle.isPending) setActionToConfirm(null) }}
        title="Confirmar cambio de estado"
        footer={(
          <div className="admin-order-detail__modal-actions">
            <Button disabled={lifecycle.isPending} onClick={() => setActionToConfirm(null)} variant="secondary">Volver</Button>
            <Button isLoading={lifecycle.isPending} loadingText="Guardando…" onClick={() => void handleActionConfirm()}>
              Confirmar cambio
            </Button>
          </div>
        )}
      >
        <p>
          {actionToConfirm ? ORDER_ACTION_LABELS[actionToConfirm] : ''} para el pedido{' '}
          <strong>{order.orderNumber}</strong>. El cambio quedará auditado.
        </p>
      </Modal>

      <Modal
        isOpen={isCancellationOpen}
        onClose={() => { if (!lifecycle.isPending) setIsCancellationOpen(false) }}
        title="Cancelar pedido"
      >
        <AdminOrderCancellationForm
          isPending={lifecycle.isPending}
          onCancel={() => setIsCancellationOpen(false)}
          onSubmit={(values) => void handleCancellation(values)}
          requiresManualRefund={order.requiresManualRefundOnCancel}
        />
      </Modal>
    </main>
  )
}

export function AdminOrderDetailPage() {
  const { orderId } = useParams()
  const order = useAdminOrder(orderId)
  useRefreshAdminSessionOnUnauthorized(order.error)

  useEffect(() => {
    document.title = 'Detalle del pedido | Margarita Arte & Deco'
    return () => { document.title = 'Margarita Arte & Deco' }
  }, [])

  if (order.isPending) return <AdminOrderDetailSkeleton />
  if (order.isError && getApiErrorStatus(order.error) !== 401) {
    return (
      <main className="admin-page admin-order-detail">
        <div className="admin-order-detail__load-error" role="alert">
          <CircleAlert aria-hidden="true" size={32} />
          <h1>{getApiErrorStatus(order.error) === 404 ? 'Pedido no encontrado' : 'No pudimos cargar el pedido'}</h1>
          <p>Volvé al listado o intentá nuevamente.</p>
          <div>
            <Link className="ui-button ui-button--secondary" to={routes.adminOrders}>Volver a pedidos</Link>
            <Button onClick={() => void order.refetch()}>Reintentar</Button>
          </div>
        </div>
      </main>
    )
  }
  return order.data ? <AdminOrderContent order={order.data} /> : null
}
