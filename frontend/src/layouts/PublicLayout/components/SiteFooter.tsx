import type { SyntheticEvent } from 'react'
import { Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import logoImage from '@/assets/images/logo-header-optimized.webp'
import { usePublicSettings } from '@/features/settings'
import { Container, DeferredImage } from '@/shared/components'

const FOOTER_LINKS = [
  { href: '/#categorias', label: 'Categorías' },
  { href: '/productos', label: 'Productos' },
  { href: '/productos?area=arte', label: 'Arte' },
  { href: '/productos?area=decoraciones', label: 'Decoraciones' },
  { href: '/#preguntas', label: 'Preguntas frecuentes' },
  { href: '/recuperar-pedido', label: 'Recuperar pedido' },
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
        </div>

        <nav aria-label="Navegación del pie" className="landing-footer__links">
          <strong>Explorá</strong>
          {FOOTER_LINKS.map((item) => (
            <Link key={item.href} to={item.href}>
              {item.label}
            </Link>
          ))}
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
