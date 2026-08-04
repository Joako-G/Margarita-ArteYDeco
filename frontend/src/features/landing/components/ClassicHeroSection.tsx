import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import heroImage from '@/assets/images/category-sellos-bajo-relieve.webp'
import { Container, Section, Typography } from '@/shared/components'

export function ClassicHeroSection() {
  return (
    <Section aria-labelledby="landing-title" background="muted" className="landing-hero">
      <Container className="landing-hero__inner">
        <div className="landing-hero__content">
          <Typography id="landing-title" variant="h1">
            Arte y Decoraciones en un solo lugar
          </Typography>
          <Typography>
            Descubrí materiales para crear y piezas hechas a mano que llenan tu hogar de belleza y
            calidez.
          </Typography>
          <Link
            className="ui-button ui-button--primary ui-button--large landing-hero__cta"
            to="/productos"
          >
            <span>Ver todos los productos</span>
            <ArrowRight aria-hidden="true" size={20} strokeWidth={2} />
          </Link>
        </div>

        <div className="landing-hero__media">
          <img
            alt="Sellos artesanales en relieve sobre una mesa de trabajo"
            className="landing-hero__image"
            decoding="async"
            fetchPriority="high"
            height="560"
            loading="eager"
            src={heroImage}
            width="560"
          />
        </div>
      </Container>
    </Section>
  )
}
