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

interface IAdminOrderCardProps {
  order: IAdminOrderListItem
}

export function AdminOrderCard({ order }: IAdminOrderCardProps) {
  const status = ORDER_STATUS_DETAILS[order.status]
  const payment = PAYMENT_STATUS_DETAILS[order.paymentStatus]

  return (
    <article className="admin-order-card">
      <div className="admin-order-card__header">
        <div className="admin-order-card__info">
          <Badge variant={status.variant}>{status.label}</Badge>
          <h3 className="admin-order-card__number">{order.orderNumber}</h3>
        </div>
        <span className="admin-order-card__total-value">{formatPrice(order.total)}</span>
      </div>

      <div className="admin-order-card__body">
        <div className="admin-order-card__customer">
          <span className="admin-order-card__customer-name">
            {order.customer.firstName} {order.customer.lastName}
          </span>
          <span className="admin-order-card__customer-phone">{order.customer.phone}</span>
        </div>

        <div className="admin-order-card__meta">
          <span className="admin-order-card__meta-label">Fecha</span>
          <time className="admin-order-card__meta-value" dateTime={order.createdAt}>
            {formatAdminOrderDate(order.createdAt)}
          </time>
        </div>

        <div className="admin-order-card__payment">
          <Badge variant={payment.variant}>{payment.label}</Badge>
          <span className="admin-order-card__payment-method">
            {PAYMENT_METHOD_LABELS[order.paymentMethod]}
          </span>
        </div>

        <div className="admin-order-card__footer">
          <span className="admin-order-card__products">
            {order.itemCount} {order.itemCount === 1 ? 'producto' : 'productos'}
          </span>
          <Link
            aria-label={`Ver detalle del pedido ${order.orderNumber}`}
            className="admin-order-card__detail"
            to={routes.adminOrderDetail(order.id)}
          >
            Ver detalle
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </div>
    </article>
  )
}
