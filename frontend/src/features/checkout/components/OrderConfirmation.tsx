import { CheckCircle2, Clock3, ExternalLink, MapPin, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'
import { settingsMock } from '@/mocks'
import { Divider, Typography } from '@/shared/components'
import { formatPrice } from '@/shared/utils/format-price'

import type { IOrderConfirmation } from '../types/checkout'
import { createWhatsAppProofUrl } from '../utils/checkout-links'
import { CopyValueButton } from './CopyValueButton'

interface IOrderConfirmationProps {
  order: IOrderConfirmation
}

export function OrderConfirmation({ order }: IOrderConfirmationProps) {
  const customerName = `${order.customer.firstName} ${order.customer.lastName}`
  const whatsappUrl = createWhatsAppProofUrl(settingsMock.whatsapp, customerName, order.orderNumber)

  return (
    <main className="checkout-confirmation" id="main-content">
      <div className="checkout-confirmation__panel">
        <CheckCircle2
          aria-hidden="true"
          className="checkout-confirmation__success-icon"
          size={48}
          strokeWidth={1.75}
        />
        <div className="checkout-confirmation__heading">
          <Typography as="h1" variant="h1">
            ¡Recibimos tu pedido!
          </Typography>
          <p>
            Tu número de pedido es <strong>{order.orderNumber}</strong>.
          </p>
          <p>Te avisaremos cuando esté listo para retirar.</p>
        </div>

        <div className="checkout-confirmation__total">
          <span>Total final</span>
          <strong>{formatPrice(order.totals.total)}</strong>
        </div>

        {order.paymentMethod === 'transfer' ? (
          <section
            aria-labelledby="bank-details-title"
            className="checkout-confirmation__bank-details"
          >
            <div>
              <Typography as="h2" id="bank-details-title" variant="h3">
                Datos para transferir
              </Typography>
              <p>
                Usá estos datos después de realizar el pedido. El descuento ya está incluido en el
                total.
              </p>
            </div>
            <dl>
              <div>
                <dt>Banco</dt>
                <dd>{settingsMock.bankName}</dd>
              </div>
              <div>
                <dt>Alias</dt>
                <dd>{settingsMock.transferAlias}</dd>
                <CopyValueButton label="Copiar alias" value={settingsMock.transferAlias} />
              </div>
              <div>
                <dt>CBU</dt>
                <dd>{settingsMock.transferCbu}</dd>
                <CopyValueButton label="Copiar CBU" value={settingsMock.transferCbu} />
              </div>
            </dl>
            <a
              className="checkout__link-button checkout__link-button--whatsapp"
              href={whatsappUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageCircle aria-hidden="true" size={20} strokeWidth={2} />
              Enviar comprobante por WhatsApp
            </a>
            <p className="checkout-confirmation__proof-note">
              WhatsApp abrirá con un mensaje preparado. Adjuntá el comprobante manualmente.
            </p>
          </section>
        ) : (
          <p className="checkout-confirmation__cash-note">
            Elegiste pagar en efectivo. Abonás el total cuando retires tu pedido.
          </p>
        )}

        <Divider />

        <section
          aria-labelledby="confirmation-pickup-title"
          className="checkout-confirmation__pickup"
        >
          <Typography as="h2" id="confirmation-pickup-title" variant="h3">
            Retiro en el local
          </Typography>
          <dl>
            <div>
              <dt>
                <MapPin aria-hidden="true" size={18} strokeWidth={2} />
                Dirección
              </dt>
              <dd>{settingsMock.address}</dd>
            </div>
            <div>
              <dt>
                <Clock3 aria-hidden="true" size={18} strokeWidth={2} />
                Horarios
              </dt>
              <dd>{settingsMock.businessHours}</dd>
            </div>
          </dl>
          <a
            className="checkout__link-button checkout__link-button--secondary"
            href={settingsMock.mapsUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Ver ubicación
            <ExternalLink aria-hidden="true" size={18} strokeWidth={2} />
          </a>
        </section>

        <Link className="checkout-confirmation__catalog-link" to={routes.products}>
          Seguir viendo productos
        </Link>
      </div>
    </main>
  )
}
