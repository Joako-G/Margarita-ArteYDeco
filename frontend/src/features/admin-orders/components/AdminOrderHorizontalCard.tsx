import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'
import { Badge } from '@/shared/components'
import { formatPrice } from '@/shared/utils/format-price'
import { ORDER_STATUS_DETAILS } from '@/shared/utils/order-status'

import type { IAdminOrderListItem } from '../types/admin-orders'
import {
  formatAdminOrderDate,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_DETAILS,
} from '../utils/admin-order-formatters'

interface IAdminOrderHorizontalCardProps {
  order: IAdminOrderListItem
}

export function AdminOrderHorizontalCard({ order }: IAdminOrderHorizontalCardProps) {
  const status = ORDER_STATUS_DETAILS[order.status]
  const payment = PAYMENT_STATUS_DETAILS[order.paymentStatus]

  return (
    <article className="admin-order-horizontal-card">
      <div className="admin-order-horizontal-card__content">
        <div className="admin-order-horizontal-card__main">
          <Badge variant={status.variant}>{status.label}</Badge>
          <span className="admin-order-horizontal-card__payment-method">
            {PAYMENT_METHOD_LABELS[order.paymentMethod]} · {payment.label}
          </span>
          <h3 className="admin-order-horizontal-card__number">{order.orderNumber}</h3>
          <span className="admin-order-horizontal-card__products">
            {order.itemCount} {order.itemCount === 1 ? 'producto' : 'productos'}
          </span>
        </div>

        <div className="admin-order-horizontal-card__blocks">
          <div className="admin-order-horizontal-card__block">
            <span className="admin-order-horizontal-card__block-label">Teléfono</span>
            <span className="admin-order-horizontal-card__block-value">
              {order.customer.firstName} {order.customer.lastName}
            </span>
          </div>

          <div className="admin-order-horizontal-card__block">
            <span className="admin-order-horizontal-card__block-label">Cliente</span>
            <span className="admin-order-horizontal-card__block-value">
              {order.customer.phone} · {order.deliveryMethod === 'shipping' ? 'Envío' : 'Retiro'}
            </span>
          </div>

          <div className="admin-order-horizontal-card__block">
            <span className="admin-order-horizontal-card__block-label">Fecha</span>
            <time className="admin-order-horizontal-card__block-value" dateTime={order.createdAt}>
              {formatAdminOrderDate(order.createdAt)}
            </time>
          </div>
        </div>
      </div>

      <div className="admin-order-horizontal-card__aside">
        <div className="admin-order-horizontal-card__total">
          <span className="admin-order-horizontal-card__total-label">Total</span>
          <span className="admin-order-horizontal-card__total-value">{formatPrice(order.total)}</span>
        </div>

        <Link
          aria-label={`Ver detalle del pedido ${order.orderNumber}`}
          className="admin-order-horizontal-card__detail"
          to={routes.adminOrderDetail(order.id)}
        >
          Ver
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </div>
    </article>
  )
}
