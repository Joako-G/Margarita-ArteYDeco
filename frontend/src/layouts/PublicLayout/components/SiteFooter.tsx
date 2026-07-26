import { Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import logoImage from '@/assets/images/logo-header.png'
import { Container } from '@/shared/components'

const FOOTER_LINKS = [
  { href: '/#inicio', label: 'Inicio' },
  { href: '/productos', label: 'Productos' },
  { href: '/#nosotros', label: 'Nosotros' },
  { href: '/#preguntas', label: 'Preguntas frecuentes' },
]

export function SiteFooter() {
  return (
    <footer className="landing-footer" id="contacto">
      <Container className="landing-footer__grid">
        <div className="landing-footer__brand">
          <img
            alt="Margaritas Arte & Deco"
            height="544"
            loading="lazy"
            src={logoImage}
            width="1097"
          />
          <p>Materiales para crear, decorar y disfrutar cada proyecto.</p>
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
