import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  MapPin,
  MessageCircle,
  PackageCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import productPlaceholderImage from '@/assets/images/product-placeholder.webp'
import { routes } from '@/config/routes'
import { Badge, Button, DeferredImage, Divider, Typography } from '@/shared/components'
import { formatPrice } from '@/shared/utils/format-price'

import type { IOrderConfirmation } from '../types/public-orders'
import {
  canResumePublicPayment,
  formatReservationDate,
  getPublicPaymentMethodLabel,
  getPublicPaymentStatusDetails,
  getReservationNoticeKind,
  PUBLIC_REFUND_NOTICE,
  shouldShowRefundNotice,
} from '../utils/public-order-payment-status'
import { getPublicOrderStatusDetails } from '../utils/public-order-status'
import { CopyValueButton } from './CopyValueButton'

interface IOrderDetailsProps {
  isForgetting: boolean
  onBack: () => void
  onForget: () => void
  order: IOrderConfirmation
}

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

function OrderHeaderCard({ order }: Pick<IOrderDetailsProps, 'order'>) {
  const status = getPublicOrderStatusDetails(order.status, order.delivery.method)

  return (
    <section aria-labelledby="order-number-title" className="public-order__surface public-order__order-header">
      <div className="public-order__order-header-topline">
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="public-order__date">
          <CalendarDays aria-hidden="true" size={16} strokeWidth={2} />
          {formatOrderDate(order.createdAt)}
        </span>
      </div>
      <span className="public-order__eyebrow">Número de pedido</span>
      <Typography as="h2" id="order-number-title" variant="h2">
        {order.orderNumber}
      </Typography>
    </section>
  )
}

function PaymentStatusCard({ order }: { order: IOrderConfirmation }) {
  const paymentStatus = getPublicPaymentStatusDetails(order.paymentMethod, order.paymentStatus)
  const paymentMethodLabel = getPublicPaymentMethodLabel(order.paymentMethod)
  const reservationDate = order.reservationExpiresAt === null ? null : formatReservationDate(order.reservationExpiresAt)
  const reservationNotice = getReservationNoticeKind(order.status, order.paymentStatus, order.reservationExpiresAt)

  return (
    <section aria-labelledby="order-payment-status-title" className="public-order__surface public-order__payment-status">
      <div className="public-order__payment-status-icon" aria-hidden="true">
        <CheckCircle2 size={22} strokeWidth={2} />
      </div>
      <div className="public-order__payment-status-copy">
        <Typography as="h2" id="order-payment-status-title" variant="h3">
          Estado del pago
        </Typography>
        <p>{paymentStatus.description}</p>
        {shouldShowRefundNotice(order) ? <p>{PUBLIC_REFUND_NOTICE}</p> : null}
      </div>
      <div className="public-order__payment-status-result">
        <span>Estado</span>
        <Badge variant={paymentStatus.variant}>{paymentStatus.label}</Badge>
        <small>{paymentMethodLabel}</small>
        {reservationNotice !== null && reservationDate !== null ? (
          <small>
            Revisamos el estado de tu pago de forma automática. {reservationNotice === 'active' ? 'Tus productos están reservados hasta' : 'La reserva de tus productos venció el'} <time dateTime={order.reservationExpiresAt ?? undefined}>{reservationDate}</time>
          </small>
        ) : null}
      </div>
    </section>
  )
}

function ProductsCard({ order }: { order: IOrderConfirmation }) {
  return (
    <section aria-labelledby="order-products-title" className="public-order__surface public-order__products-card">
      <div className="public-order__section-heading">
        <PackageCheck aria-hidden="true" size={22} strokeWidth={1.75} />
        <Typography as="h2" id="order-products-title" variant="h3">
          Productos
        </Typography>
      </div>
      <ul className="public-order__items">
        {order.items.map((item, index) => (
          <li key={`${item.name}-${item.unitPrice}-${index}`}>
            <DeferredImage
              alt={`Imagen de ${item.name}`}
              className="public-order__item-image"
              fallbackAlt={`Imagen no disponible para ${item.name}`}
              fallbackSrc={productPlaceholderImage}
              height="96"
              src={item.imageUrl}
              width="96"
            />
            <div className="public-order__item-copy">
              <strong>{item.name}</strong>
              <span>{item.quantity} unidades</span>
              {item.productDiscountPercentage > 0 ? (
                <small>
                  Antes {formatPrice(item.listUnitPrice)} · {item.productDiscountPercentage}% de descuento
                </small>
              ) : null}
            </div>
            <strong className="public-order__item-total">{formatPrice(item.lineTotal)}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}

function EconomicSummary({ order }: { order: IOrderConfirmation }) {
  return (
    <section aria-labelledby="order-summary-title" className="public-order__surface public-order__economic-summary">
      <Typography as="h2" id="order-summary-title" variant="h3">
        Resumen económico
      </Typography>
      <dl className="public-order__totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatPrice(order.totals.subtotal)}</dd>
        </div>
        <div>
          <dt>Descuento ({order.totals.discountPercentage}%)</dt>
          <dd>-{formatPrice(order.totals.discount)}</dd>
        </div>
      </dl>
      <Divider />
      <div className="public-order__final-total">
        <span>Total final</span>
        <strong>{formatPrice(order.totals.total)}</strong>
      </div>
    </section>
  )
}

function PaymentMethodCard({ order }: { order: IOrderConfirmation }) {
  const paymentMethodLabel = getPublicPaymentMethodLabel(order.paymentMethod)
  const bankDetails = order.paymentMethod === 'transfer' ? order.bankDetails : null

  return (
    <section aria-labelledby="order-payment-title" className="public-order__surface public-order__payment-method">
      <div className="public-order__section-heading">
        <CreditCard aria-hidden="true" size={22} strokeWidth={1.75} />
        <Typography as="h2" id="order-payment-title" variant="h3">
          Método de pago
        </Typography>
      </div>
      <p className="public-order__method-name">{paymentMethodLabel}</p>
      {order.paymentMethod === 'transfer' && bankDetails !== null ? (
        <>
          <p className="public-order__note">El descuento ya está incluido en el total confirmado.</p>
          <dl className="public-order__bank-details">
            <div>
              <dt>Banco</dt>
              <dd>{bankDetails.bankName}</dd>
            </div>
            <div>
              <dt>Alias</dt>
              <dd>{bankDetails.alias}</dd>
              <CopyValueButton label="Copiar alias" value={bankDetails.alias} />
            </div>
            <div>
              <dt>CBU</dt>
              <dd>{bankDetails.cbu}</dd>
              <CopyValueButton label="Copiar CBU" value={bankDetails.cbu} />
            </div>
          </dl>
          <a className="public-order__button public-order__button--whatsapp" href={order.whatsappProofUrl} rel="noopener noreferrer" target="_blank">
            <MessageCircle aria-hidden="true" size={18} strokeWidth={2} />
            Enviar comprobante por WhatsApp
          </a>
          <p className="public-order__note">WhatsApp abrirá con un mensaje preparado. Adjuntá el comprobante manualmente.</p>
        </>
      ) : order.paymentMethod === 'mercado_pago' ? (
        <p className="public-order__cash-note">Elegiste pagar con Mercado Pago. El pago se procesa de forma segura en la plataforma de Mercado Pago.</p>
      ) : (
        <p className="public-order__cash-note">Elegiste pagar en efectivo. Abonás el total cuando retires tu pedido.</p>
      )}
    </section>
  )
}

function DeliveryMethodCard({ order }: { order: IOrderConfirmation }) {
  return (
    <section aria-labelledby="order-delivery-title" className="public-order__surface public-order__delivery-method">
      <div className="public-order__section-heading">
        <MapPin aria-hidden="true" size={22} strokeWidth={1.75} />
        <Typography as="h2" id="order-delivery-title" variant="h3">
          Método de entrega
        </Typography>
      </div>
      <strong>{order.delivery.method === 'pickup' ? 'Retiro en el local' : 'Envío a coordinar'}</strong>
      {order.delivery.method === 'shipping' ? (
        <dl className="public-order__pickup">
          <div>
            <dt>Dirección de entrega</dt>
            <dd>{order.delivery.shippingAddress}</dd>
          </div>
        </dl>
      ) : (
        <dl className="public-order__pickup">
          <div>
            <dt>Dirección</dt>
            <dd>{order.pickup.address}</dd>
          </div>
          <div>
            <dt>Horarios</dt>
            <dd>{order.pickup.businessHours}</dd>
          </div>
        </dl>
      )}
      {order.delivery.method === 'shipping' ? (
        <p className="public-order__note">Nos comunicaremos por WhatsApp para coordinar el costo y la entrega.</p>
      ) : (
        <a className="public-order__button public-order__button--secondary" href={order.pickup.mapsUrl} rel="noopener noreferrer" target="_blank">
          Ver ubicación
          <ExternalLink aria-hidden="true" size={17} strokeWidth={2} />
        </a>
      )}
    </section>
  )
}

export function OrderDetails({ isForgetting, onBack, onForget, order }: IOrderDetailsProps) {
  return (
    <main className="public-order" id="main-content">
      <div className="public-order__shell">
        <header className="public-order__page-heading">
          <button aria-label="Volver a mis pedidos" className="public-order__page-back" onClick={onBack} type="button">
            <ArrowLeft aria-hidden="true" size={20} strokeWidth={2} />
          </button>
          <h1 className="public-order__page-title">Detalle del pedido</h1>
          <span aria-hidden="true" />
        </header>
        <div className="public-order__layout">
          <div className="public-order__main-column">
            <OrderHeaderCard order={order} />
            <PaymentStatusCard order={order} />
            <ProductsCard order={order} />
          </div>
          <aside className="public-order__aside">
            <EconomicSummary order={order} />
            <PaymentMethodCard order={order} />
            <DeliveryMethodCard order={order} />
            <nav aria-label="Acciones del pedido" className="public-order__actions">
              {canResumePublicPayment(order.paymentMethod, order.paymentStatus, order.canResumePayment) ? (
                <Link className="public-order__button" to={routes.paymentStatusPath(order.orderNumber)}>
                  Continuar pago
                </Link>
              ) : null}
              <Link className="public-order__button public-order__button--secondary" to={routes.products}>
                Seguir comprando
              </Link>
              <Link className="public-order__text-action" to={routes.recoverOrder}>
                Recuperar otro pedido
              </Link>
              <Button disabled={isForgetting} isLoading={isForgetting} loadingText="Olvidando pedidos…" onClick={onForget} variant="ghost">
                Olvidar pedidos de este dispositivo
              </Button>
            </nav>
          </aside>
        </div>
      </div>
    </main>
  )
}
