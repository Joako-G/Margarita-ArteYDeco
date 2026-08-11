import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Clock,
  PackageCheck,
  Phone,
  Trash2,
  Truck,
  User,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { routes } from '@/config/routes'
import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  AdminOrderCancellationForm,
  AdminWhatsAppComposer,
  formatAdminOrderDate,
  getAdminOrderErrorMessage,
  getOrderDisplayNumber,
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

const ORDER_ACTION_SUCCESS_MESSAGES: Record<AdminOrderActionType, string> = {
  confirmPayment: 'Pago confirmado. El pedido ya figura como pagado.',
  confirmOrder: 'Pedido confirmado. Ya podés comenzar a prepararlo.',
  markDelivered: 'Pedido entregado. La entrega quedó registrada.',
  markPickedUp: 'Pedido retirado. El retiro quedó registrado.',
  markReady: 'Pedido listo. Ya podés avisarle al cliente.',
  startPreparing: 'Preparación iniciada. El pedido ya muestra su nuevo estado.',
}

function AdminOrderContent({ order }: IAdminOrderContentProps) {
  const lifecycle = useAdminOrderLifecycle()
  const [actionToConfirm, setActionToConfirm] = useState<AdminOrderActionType | null>(null)
  const [isCancellationOpen, setIsCancellationOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const status = ORDER_STATUS_DETAILS[order.status]
  const payment = PAYMENT_STATUS_DETAILS[order.paymentStatus]
  const displayNumber = getOrderDisplayNumber(order.orderNumber)
  const hasSingleProduct = order.items.length === 1
  const hasDiscount = order.discount > 0

  useRefreshAdminSessionOnUnauthorized(lifecycle.error)

  async function handleActionConfirm() {
    if (actionToConfirm === null) return
    setFeedback(null)
    try {
      await lifecycle.mutateAsync({ action: 'transition', order, transition: actionToConfirm })
      setFeedback({ message: ORDER_ACTION_SUCCESS_MESSAGES[actionToConfirm], type: 'success' })
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
        message: 'Pedido cancelado. Las unidades de sus productos volvieron al stock disponible.',
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
        description={`Realizado el ${formatAdminOrderDate(order.createdAt)}`}
        sectionLabel="Pedido"
        title={`Pedido #${displayNumber}`}
        titleId="admin-order-title"
      />

      <p className="admin-order-detail__reference">
        Referencia: {order.orderNumber}
      </p>

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
          <h2 id="order-operation-title">Qué sigue con este pedido</h2>
          <div className="admin-order-detail__status">
            <Badge className="admin-order-detail__status-badge" variant={status.variant}>{status.label}</Badge>
            <div className="admin-order-detail__payment-info">
              <Badge variant={payment.variant}>{payment.label}</Badge>
              <span className="admin-order-detail__payment-method">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
            </div>
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
            <p className="admin-order-detail__section-label">Productos</p>
            <h2 id="order-products-title">
              {hasSingleProduct ? 'Producto' : `${order.itemCount} productos`}
            </h2>
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
            {(!hasSingleProduct || hasDiscount) ? (
              <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            ) : null}
            {hasDiscount ? (
              <div><dt>Descuento</dt><dd>− {formatPrice(order.discount)}</dd></div>
            ) : null}
            <div className="admin-order-totals__total"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="order-customer-title" className="admin-order-detail__panel admin-order-detail__customer">
          <div className="admin-order-detail__panel-heading">
            <p className="admin-order-detail__section-label">Cliente</p>
            <h2 id="order-customer-title">Información de contacto</h2>
          </div>
          <div className="admin-order-customer">
            <div className="admin-order-customer__row">
              <div className="admin-order-customer__icon">
                <User aria-hidden="true" size={20} />
              </div>
              <div className="admin-order-customer__info">
                <span className="admin-order-customer__value">{order.customer.firstName} {order.customer.lastName}</span>
              </div>
            </div>
            <div className="admin-order-customer__row">
              <div className="admin-order-customer__icon">
                <Phone aria-hidden="true" size={20} />
              </div>
              <div className="admin-order-customer__info">
                <span className="admin-order-customer__value">{order.customer.phone}</span>
              </div>
            </div>
            <div className="admin-order-customer__row">
              <div className="admin-order-customer__icon">
                <Clock aria-hidden="true" size={20} />
              </div>
              <div className="admin-order-customer__info">
                <span className="admin-order-customer__value">{order.business.businessHours}</span>
              </div>
            </div>
          </div>
          {order.notes ? (
            <div className="admin-order-detail__notes">
              <strong>Observaciones</strong>
              <p>{order.notes}</p>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="order-delivery-title" className="admin-order-detail__panel">
          <div className="admin-order-detail__panel-heading">
            <p className="admin-order-detail__section-label">Entrega</p>
            <h2 id="order-delivery-title">Cómo recibe el pedido</h2>
          </div>
          <div className="admin-order-customer">
            <div className="admin-order-customer__row">
              <div className="admin-order-customer__icon">
                <Truck aria-hidden="true" size={20} />
              </div>
              <div className="admin-order-customer__info">
                <span className="admin-order-detail__section-label">Tipo</span>
                <span className="admin-order-customer__value">
                  {order.deliveryMethod === 'pickup' ? 'Retiro en el local' : 'Envío'}
                </span>
              </div>
            </div>
            {order.deliveryMethod === 'shipping' ? (
              <div className="admin-order-customer__row">
                <div className="admin-order-customer__info">
                  <span className="admin-order-detail__section-label">Dirección</span>
                  <span className="admin-order-customer__value">{order.shippingAddress}</span>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section aria-labelledby="order-whatsapp-title" className="admin-order-detail__panel admin-order-detail__whatsapp">
        <div className="admin-order-detail__panel-heading">
          <p className="admin-order-detail__section-label">Comunicación</p>
          <h2 id="order-whatsapp-title">Contactar al cliente</h2>
          <p>Podés modificar el mensaje antes de abrir la conversación.</p>
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
          Vas a elegir “{actionToConfirm ? ORDER_ACTION_LABELS[actionToConfirm] : ''}” para el pedido{' '}
          <strong>{order.orderNumber}</strong>. El cambio quedará guardado en su historial.
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
