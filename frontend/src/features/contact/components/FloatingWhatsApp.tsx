import { MessageCircle } from 'lucide-react'

import { usePublicSettings } from '@/features/settings'
import { FloatingButton } from '@/shared/components'
import { buildWhatsAppUrl } from '@/shared/utils/whatsapp'

import './floating-whatsapp.css'

export function FloatingWhatsApp() {
  const { data: settings } = usePublicSettings()
  const whatsapp = settings?.whatsapp

  if (!whatsapp) return null

  const whatsappUrl = buildWhatsAppUrl(whatsapp)

  function handleOpenWhatsApp() {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <FloatingButton
      aria-label="Contactar por WhatsApp"
      className="floating-whatsapp"
      onClick={handleOpenWhatsApp}
      title="Contactar por WhatsApp"
    >
      <MessageCircle aria-hidden="true" size={24} strokeWidth={2} />
    </FloatingButton>
  )
}
