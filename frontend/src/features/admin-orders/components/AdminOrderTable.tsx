import { useEffect, useState } from 'react'
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
import { AdminOrderCard } from './AdminOrderCard'
import { AdminOrderHorizontalCard } from './AdminOrderHorizontalCard'

interface IAdminOrderTableProps {
  orders: readonly IAdminOrderListItem[]
}

type AdminOrderListLayoutType = 'mobile' | 'card' | 'table'

const LAYOUT_MEDIA_QUERY = '(min-width: 80rem)'
const MOBILE_MEDIA_QUERY = '(max-width: 39.999rem)'

function useAdminOrderListLayout() {
  const [layout, setLayout] = useState<AdminOrderListLayoutType>(() => {
    if (typeof window === 'undefined') return 'table'

    return window.matchMedia(LAYOUT_MEDIA_QUERY).matches ? 'table' : 'mobile'
  })

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const layoutQuery = window.matchMedia(LAYOUT_MEDIA_QUERY)

    const handleChange = () => {
      if (layoutQuery.matches) {
        setLayout('table')
      } else if (mobileQuery.matches) {
        setLayout('mobile')
      } else {
        setLayout('card')
      }
    }

    mobileQuery.addEventListener('change', handleChange)
    layoutQuery.addEventListener('change', handleChange)

    return () => {
      mobileQuery.removeEventListener('change', handleChange)
      layoutQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return layout
}

function AdminOrderTableView({ orders }: { orders: readonly IAdminOrderListItem[] }) {
  return (
    <div aria-label="Listado de pedidos" className="admin-order-table" role="region">
      <table>
        <caption className="sr-only">Pedidos del panel administrativo</caption>
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

export function AdminOrderTable({ orders }: IAdminOrderTableProps) {
  const layout = useAdminOrderListLayout()

  if (layout === 'mobile') {
    return (
      <div aria-label="Listado de pedidos" className="admin-order-cards" role="region">
        {orders.map((order) => (
          <AdminOrderCard key={order.id} order={order} />
        ))}
      </div>
    )
  }

  if (layout === 'card') {
    return (
      <ul aria-label="Listado de pedidos" className="admin-order-horizontal-cards" role="list">
        {orders.map((order) => (
          <li key={order.id}>
            <AdminOrderHorizontalCard order={order} />
          </li>
        ))}
      </ul>
    )
  }

  return <AdminOrderTableView orders={orders} />
}
