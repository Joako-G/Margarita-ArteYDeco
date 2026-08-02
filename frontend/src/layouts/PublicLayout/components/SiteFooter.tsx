import type { SyntheticEvent } from 'react'
import { Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import logoImage from '@/assets/images/logo-header.png'
import { settingsMock } from '@/mocks'
import { Container, DeferredImage } from '@/shared/components'

const FOOTER_LINKS = [
  { href: '/#categorias', label: 'Categorías' },
  { href: '/productos', label: 'Productos' },
  { href: '/productos?area=arte', label: 'Arte' },
  { href: '/productos?area=decoraciones', label: 'Decoraciones' },
  { href: '/#preguntas', label: 'Preguntas frecuentes' },
]

function handleLogoError(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src !== logoImage) {
    event.currentTarget.src = logoImage
  }
}

export function SiteFooter() {
  const logoSource = settingsMock.logoUrl ?? logoImage

  return (
    <footer className="landing-footer" id="contacto">
      <Container className="landing-footer__grid">
        <div className="landing-footer__brand">
          <DeferredImage
            alt="Margaritas Arte & Deco"
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
            La dirección se informa antes de confirmar.
          </p>
          <p>
            <Clock3 aria-hidden="true" size={20} strokeWidth={2} />
            Los horarios se muestran durante la compra.
          </p>
        </div>
      </Container>
      <Container className="landing-footer__bottom">
        <span>© 2026 Margaritas Arte & Deco</span>
        <span>Hecho para acompañar tus ideas.</span>
      </Container>
    </footer>
  )
}
