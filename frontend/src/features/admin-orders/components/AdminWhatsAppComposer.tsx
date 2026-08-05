import { useMemo, useState } from 'react'
import { ExternalLink, MessageCircle, RotateCcw } from 'lucide-react'

import { Button, TextArea } from '@/shared/components'

import type { IAdminOrderDetail } from '../types/admin-orders'
import {
  buildAdminWhatsAppUrl,
  getAdminWhatsAppTemplate,
  type AdminWhatsAppTemplateType,
} from '../utils/admin-order-formatters'

interface IAdminWhatsAppComposerProps {
  order: IAdminOrderDetail
}

export function AdminWhatsAppComposer({ order }: IAdminWhatsAppComposerProps) {
  const templates = useMemo(() => {
    const available: { label: string; value: AdminWhatsAppTemplateType }[] = [
      { label: 'Contactar cliente', value: 'contact' },
    ]
    if (order.status === 'ready') available.push({ label: 'Avisar que está listo', value: 'ready' })
    if (order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'pending') {
      available.push({ label: 'Recordar transferencia', value: 'transferReminder' })
    }
    return available
  }, [order.paymentMethod, order.paymentStatus, order.status])
  const [selected, setSelected] = useState<AdminWhatsAppTemplateType>('contact')
  const [message, setMessage] = useState(() => getAdminWhatsAppTemplate(order, 'contact'))

  function handleTemplate(template: AdminWhatsAppTemplateType) {
    setSelected(template)
    setMessage(getAdminWhatsAppTemplate(order, template))
  }

  function handleReset() {
    setMessage(getAdminWhatsAppTemplate(order, selected))
  }

  return (
    <div className="admin-whatsapp-composer">
      <div aria-label="Tipo de mensaje" className="admin-whatsapp-composer__templates" role="group">
        {templates.map((template) => (
          <Button
            aria-pressed={selected === template.value}
            key={template.value}
            onClick={() => handleTemplate(template.value)}
            size="small"
            variant={selected === template.value ? 'secondary' : 'ghost'}
          >
            {template.label}
          </Button>
        ))}
      </div>
      <TextArea
        label="Mensaje"
        onChange={(event) => setMessage(event.target.value)}
        value={message}
      />
      <div className="admin-whatsapp-composer__actions">
        <Button
          onClick={handleReset}
          type="button"
          variant="ghost"
        >
          <RotateCcw aria-hidden="true" size={18} />
          Restablecer mensaje
        </Button>
        <a
          className="ui-button ui-button--primary admin-whatsapp-composer__open"
          href={buildAdminWhatsAppUrl(order.customer.phone, message)}
          rel="noreferrer"
          target="_blank"
        >
          <MessageCircle aria-hidden="true" size={18} />
          Abrir WhatsApp
          <ExternalLink aria-hidden="true" size={16} />
        </a>
      </div>
    </div>
  )
}
