import type { SyntheticEvent } from 'react'
import { Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import logoImage from '@/assets/images/logo-header-optimized.webp'
import { createSocialLinks, SocialLinks } from '@/features/social'
import { usePublicSettings } from '@/features/settings'
import { Container, DeferredImage } from '@/shared/components'
import { buildWhatsAppUrl } from '@/shared/utils/whatsapp'

const FOOTER_LINKS = [
  { href: '/#categorias', label: 'Categorías' },
  { href: '/productos', label: 'Productos' },
  { href: '/productos?area=arte', label: 'Arte' },
  { href: '/productos?area=decoraciones', label: 'Decoraciones' },
  { href: '/#preguntas', label: 'Preguntas frecuentes' },
  { href: '/recuperar-pedido', label: 'Recuperar pedido' },
]

const LEGAL_LINKS = [
  { href: '/politica-de-privacidad', label: 'Política de Privacidad' },
  { href: '/terminos-y-condiciones', label: 'Términos y Condiciones' },
]

function handleLogoError(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src !== logoImage) {
    event.currentTarget.src = logoImage
  }
}

export function SiteFooter() {
  const { data: settings, isError, isPending } = usePublicSettings()
  const logoSource = settings?.logoUrl ?? logoImage
  const address = isPending
    ? 'Cargando dirección del local…'
    : isError
      ? 'Consultanos la dirección antes de acercarte.'
      : (settings?.address ?? 'Consultanos la dirección antes de acercarte.')
  const businessHours = isPending
    ? 'Cargando horarios de atención…'
    : isError
      ? 'Consultanos los horarios de atención.'
      : (settings?.businessHours ?? 'Consultanos los horarios de atención.')
  const socialLinks = createSocialLinks(settings)

  return (
    <footer className="landing-footer" id="contacto">
      <Container className="landing-footer__grid">
        <div className="landing-footer__brand">
          <DeferredImage
            alt={settings?.businessName ?? 'Margaritas Arte & Deco'}
            height="544"
            onError={handleLogoError}
            src={logoSource}
            width="1097"
          />
          <p>Materiales para crear y decoraciones terminadas a mano.</p>
          <SocialLinks links={socialLinks} />
        </div>

        <nav aria-label="Navegación del pie" className="landing-footer__links">
          <strong>Explorá</strong>
          {FOOTER_LINKS.map((item) => (
            <Link key={item.href} to={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Información legal" className="landing-footer__legal">
          <strong>Información</strong>
          {LEGAL_LINKS.map((item) => (
            <Link key={item.href} to={item.href}>
              {item.label}
            </Link>
          ))}
          {settings?.whatsapp ? (
            <a href={buildWhatsAppUrl(settings.whatsapp)} rel="noopener noreferrer" target="_blank">
              Contacto
            </a>
          ) : (
            <span>Contacto</span>
          )}
        </nav>

        <div className="landing-footer__pickup">
          <strong>Retiro en el local</strong>
          <p>
            <MapPin aria-hidden="true" size={20} strokeWidth={2} />
            {address}
          </p>
          <p>
            <Clock3 aria-hidden="true" size={20} strokeWidth={2} />
            {businessHours}
          </p>
        </div>
      </Container>
      <Container className="landing-footer__bottom">
        <span>© 2026 {settings?.businessName ?? 'Margaritas Arte & Deco'}</span>
        <span>Hecho para acompañar tus ideas.</span>
      </Container>
    </footer>
  )
}
