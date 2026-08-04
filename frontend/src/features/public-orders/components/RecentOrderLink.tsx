import { useEffect } from 'react'
import { ClipboardList, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'

import { useRecentOrder } from '../hooks/usePublicOrders'
import { setLastOrderNumber } from '../utils/last-order'
import { isGuestSessionRequired } from '../utils/public-order-errors'

interface IRecentOrderLinkProps {
  onNavigate?: () => void
}

export function RecentOrderLink({ onNavigate }: IRecentOrderLinkProps) {
  const { data: order, error } = useRecentOrder()

  useEffect(() => {
    if (order !== null && order !== undefined) setLastOrderNumber(order.orderNumber)
  }, [order])

  if (order === null) return null

  if (order === undefined) {
    if (!isGuestSessionRequired(error)) return null

    return (
      <Link onClick={onNavigate} to={routes.recoverOrder}>
        <Search aria-hidden="true" size={18} strokeWidth={2} />
        Recuperar pedido
      </Link>
    )
  }

  return (
    <Link onClick={onNavigate} to={routes.orderPath(order.orderNumber)}>
      <ClipboardList aria-hidden="true" size={18} strokeWidth={2} />
      Ver mi último pedido
    </Link>
  )
}
