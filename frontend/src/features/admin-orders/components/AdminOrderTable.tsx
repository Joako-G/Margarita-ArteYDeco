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

interface IAdminOrderTableProps {
  orders: readonly IAdminOrderListItem[]
}

export function AdminOrderTable({ orders }: IAdminOrderTableProps) {
  return (
    <div aria-label="Listado de pedidos" className="admin-order-table" role="region">
      <table>
        <caption className="sr-only">Pedidos administrativos</caption>
        <thead>
          <tr>
            <th scope="col">Pedido</th>
            <th scope="col">Cliente</th>
            <th scope="col">Estado</th>
            <th scope="col">Pago</th>
            <th scope="col">Total</th>
            <th scope="col">Fecha</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const status = ORDER_STATUS_DETAILS[order.status]
            const payment = PAYMENT_STATUS_DETAILS[order.paymentStatus]
            return (
              <tr key={order.id}>
                <td data-label="Pedido">
                  <span className="admin-order-table__stacked">
                    <strong>{order.orderNumber}</strong>
                    <span>{order.itemCount} {order.itemCount === 1 ? 'producto' : 'productos'}</span>
                  </span>
                </td>
                <td data-label="Cliente">
                  <span className="admin-order-table__stacked">
                    <strong>{order.customer.firstName} {order.customer.lastName}</strong>
                    <span>{order.customer.phone}</span>
                  </span>
                </td>
                <td data-label="Estado"><Badge variant={status.variant}>{status.label}</Badge></td>
                <td data-label="Pago">
                  <span className="admin-order-table__payment">
                    <Badge variant={payment.variant}>{payment.label}</Badge>
                    <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
                  </span>
                </td>
                <td data-label="Total">
                  <strong className="admin-order-table__numeric">{formatPrice(order.total)}</strong>
                </td>
                <td data-label="Fecha">
                  <time dateTime={order.createdAt}>{formatAdminOrderDate(order.createdAt)}</time>
                </td>
                <td data-label="Acciones">
                  <Link
                    aria-label={`Ver detalle del pedido ${order.orderNumber}`}
                    className="admin-order-table__detail"
                    to={routes.adminOrderDetail(order.id)}
                  >
                    Ver detalle
                    <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
