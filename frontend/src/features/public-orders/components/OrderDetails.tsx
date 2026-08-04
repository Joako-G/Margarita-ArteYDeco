import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'
import { Badge, Button, Divider, Typography } from '@/shared/components'
import { formatPrice } from '@/shared/utils/format-price'
import { ORDER_STATUS_DETAILS } from '@/shared/utils/order-status'

import type { IOrderConfirmation } from '../types/public-orders'
import { CopyValueButton } from './CopyValueButton'

interface IOrderDetailsProps {
  isForgetting: boolean
  onForget: () => void
  order: IOrderConfirmation
}

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function OrderDetails({ isForgetting, onForget, order }: IOrderDetailsProps) {
  const status = ORDER_STATUS_DETAILS[order.status]
  const bankDetails = order.paymentMethod === 'transfer' ? order.bankDetails : null

  return (
    <main className="public-order" id="main-content">
      <div className="public-order__panel">
        <header className="public-order__heading">
          <div className="public-order__heading-icon" aria-hidden="true">
            <ShieldCheck size={32} strokeWidth={1.75} />
          </div>
          <div>
            <Badge variant={status.variant}>{status.label}</Badge>
            <Typography as="h1" variant="h1">
              Pedido {order.orderNumber}
            </Typography>
            <p className="public-order__date">
              <CalendarDays aria-hidden="true" size={18} strokeWidth={2} />
              {formatOrderDate(order.createdAt)}
            </p>
          </div>
        </header>

        <div className="public-order__total">
          <span>Total final</span>
          <strong>{formatPrice(order.totals.total)}</strong>
        </div>

        <section aria-labelledby="order-products-title" className="public-order__section">
          <Typography as="h2" id="order-products-title" variant="h3">
            Productos
          </Typography>
          <ul className="public-order__items">
            {order.items.map((item, index) => (
              <li key={`${item.name}-${item.unitPrice}-${index}`}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.quantity} × {formatPrice(item.unitPrice)}
                  </span>
                </div>
                <strong>{formatPrice(item.lineTotal)}</strong>
              </li>
            ))}
          </ul>
          <dl className="public-order__totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(order.totals.subtotal)}</dd>
            </div>
            <div>
              <dt>Descuento ({order.totals.discountPercentage}%)</dt>
              <dd>{formatPrice(order.totals.discount)}</dd>
            </div>
          </dl>
        </section>

        {order.paymentMethod === 'transfer' && bankDetails !== null ? (
          <section aria-labelledby="order-bank-title" className="public-order__section">
            <div>
              <Typography as="h2" id="order-bank-title" variant="h3">
                Datos para transferir
              </Typography>
              <p>El descuento ya está incluido en el total confirmado.</p>
            </div>
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
            <a
              className="public-order__button public-order__button--whatsapp"
              href={order.whatsappProofUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageCircle aria-hidden="true" size={20} strokeWidth={2} />
              Enviar comprobante por WhatsApp
            </a>
            <p className="public-order__note">
              WhatsApp abrirá con un mensaje preparado. Adjuntá el comprobante manualmente.
            </p>
          </section>
        ) : order.paymentMethod === 'transfer' ? (
          <p className="public-order__bank-warning" role="alert">
            Los datos de transferencia no están disponibles. No realices el pago y contactanos
            antes de continuar.
          </p>
        ) : (
          <p className="public-order__cash-note">
            Elegiste pagar en efectivo. Abonás el total cuando retires tu pedido.
          </p>
        )}

        <Divider />

        <section aria-labelledby="order-pickup-title" className="public-order__section">
          <Typography as="h2" id="order-pickup-title" variant="h3">
            Retiro en el local
          </Typography>
          <dl className="public-order__pickup">
            <div>
              <dt>
                <MapPin aria-hidden="true" size={18} strokeWidth={2} />
                Dirección
              </dt>
              <dd>{order.pickup.address}</dd>
            </div>
            <div>
              <dt>
                <Clock3 aria-hidden="true" size={18} strokeWidth={2} />
                Horarios
              </dt>
              <dd>{order.pickup.businessHours}</dd>
            </div>
          </dl>
          <a
            className="public-order__button public-order__button--secondary"
            href={order.pickup.mapsUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Ver ubicación
            <ExternalLink aria-hidden="true" size={18} strokeWidth={2} />
          </a>
        </section>

        <nav aria-label="Acciones del pedido" className="public-order__actions">
          <Link to={routes.products}>Seguir viendo productos</Link>
          <Link to={routes.recoverOrder}>Recuperar otro pedido</Link>
          <Button
            disabled={isForgetting}
            isLoading={isForgetting}
            loadingText="Olvidando pedidos…"
            onClick={onForget}
            variant="ghost"
          >
            Olvidar pedidos de este dispositivo
          </Button>
        </nav>
      </div>
    </main>
  )
}
