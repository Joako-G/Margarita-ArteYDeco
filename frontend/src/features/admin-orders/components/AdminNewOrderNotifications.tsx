import { useEffect, useId, useRef, useState } from 'react'
import { Bell, PackagePlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'
import { formatPrice } from '@/shared/utils/format-price'

import { useNewOrderNotices } from '../hooks/useNewOrderNotices'
import {
  formatAdminOrderDate,
  getOrderDisplayNumber,
  PAYMENT_METHOD_LABELS,
} from '../utils/admin-order-formatters'
import './AdminNewOrderNotifications.css'

function buildTriggerLabel(count: number) {
  if (count === 0) return 'Notificaciones: sin pedidos nuevos'
  if (count === 1) return 'Notificaciones: 1 pedido nuevo'

  return `Notificaciones: ${count} pedidos nuevos`
}

export function AdminNewOrderNotifications() {
  const { clearNotices, dismissNotice, notices } = useNewOrderNotices()
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const triggerLabel = buildTriggerLabel(notices.length)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="admin-order-notifications" ref={containerRef}>
      <p aria-live="polite" className="admin-order-notifications__live" role="status">
        {notices.length > 0 ? triggerLabel : ''}
      </p>

      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={triggerLabel}
        className="admin-order-notifications__trigger"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        ref={triggerRef}
        type="button"
      >
        <Bell aria-hidden="true" size={20} strokeWidth={2} />
        {notices.length > 0 ? (
          <span aria-hidden="true" className="admin-order-notifications__badge">
            {notices.length}
          </span>
        ) : null}
      </button>

      <div className="admin-order-notifications__panel" hidden={!isOpen} id={panelId}>
        <div className="admin-order-notifications__heading">
          <strong>Pedidos nuevos</strong>
          {notices.length > 0 ? (
            <button
              className="admin-order-notifications__clear"
              onClick={clearNotices}
              type="button"
            >
              Marcar como leídos
            </button>
          ) : null}
        </div>

        {notices.length === 0 ? (
          <p className="admin-order-notifications__empty">
            No entraron pedidos nuevos desde que abriste el panel.
          </p>
        ) : (
          <ul className="admin-order-notifications__list">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  className="admin-order-notifications__item"
                  onClick={() => {
                    dismissNotice(notice.id)
                    setIsOpen(false)
                  }}
                  to={routes.adminOrderDetail(notice.id)}
                >
                  <PackagePlus aria-hidden="true" size={18} strokeWidth={2} />
                  <span className="admin-order-notifications__item-copy">
                    <strong>Pedido {getOrderDisplayNumber(notice.orderNumber)}</strong>
                    <small>
                      {formatPrice(notice.total)} · {PAYMENT_METHOD_LABELS[notice.paymentMethod]}
                    </small>
                    <small>{formatAdminOrderDate(notice.createdAt)}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          className="admin-order-notifications__all"
          onClick={() => setIsOpen(false)}
          to={routes.adminOrders}
        >
          Ver todos los pedidos
        </Link>
      </div>
    </div>
  )
}
