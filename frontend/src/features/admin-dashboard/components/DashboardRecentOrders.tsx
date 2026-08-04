import { ClipboardList } from 'lucide-react'

import { Badge } from '@/shared/components'
import { formatPrice } from '@/shared/utils/format-price'
import { ORDER_STATUS_DETAILS } from '@/shared/utils/order-status'

import type { IAdminDashboard } from '../types/admin-dashboard'
import {
  formatDashboardDate,
  getPaymentMethodLabel,
} from '../utils/admin-dashboard-formatters'

interface IDashboardRecentOrdersProps {
  completedOrders: number
  orders: IAdminDashboard['recentOrders']
}

export function DashboardRecentOrders({
  completedOrders,
  orders,
}: IDashboardRecentOrdersProps) {
  return (
    <section aria-labelledby="dashboard-orders-title" className="admin-dashboard__panel">
      <div className="admin-dashboard__panel-heading admin-dashboard__panel-heading--split">
        <div className="admin-dashboard__panel-heading-group">
          <span aria-hidden="true" className="admin-dashboard__panel-icon">
            <ClipboardList size={22} />
          </span>
          <div>
            <p className="admin-dashboard__section-label">Pedidos</p>
            <h2 id="dashboard-orders-title">Actividad reciente</h2>
          </div>
        </div>
        <p className="admin-dashboard__completed-count">
          <strong>{completedOrders}</strong>
          <span>retirados</span>
        </p>
      </div>

      <p className="admin-dashboard__panel-intro">
        Los pedidos más recientes recibidos en tu tienda.
      </p>

      {orders.length === 0 ? (
        <p className="admin-dashboard__empty">Todavía no recibiste pedidos.</p>
      ) : (
        <ol className="admin-dashboard__order-list">
          {orders.map((order) => {
            const status = ORDER_STATUS_DETAILS[order.status]

            return (
              <li key={order.orderNumber}>
                <div className="admin-dashboard__order-main">
                  <strong>{order.orderNumber}</strong>
                  <span>{order.customerName}</span>
                </div>
                <div className="admin-dashboard__order-meta">
                  <time dateTime={order.createdAt}>{formatDashboardDate(order.createdAt)}</time>
                  <span>{getPaymentMethodLabel(order.paymentMethod)}</span>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
                <strong className="admin-dashboard__order-total">
                  {formatPrice(order.total)}
                </strong>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
