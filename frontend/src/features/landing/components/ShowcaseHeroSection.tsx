import { ArrowRight, Heart, Lightbulb, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

import heroImageSmall from '@/assets/images/hero-decoracion-480.webp'
import heroImage from '@/assets/images/hero-decoracion-800.webp'
import { Badge, Container, Section, Typography } from '@/shared/components'
import type { IProduct } from '@/shared/types/catalog'
import { formatPrice } from '@/shared/utils/format-price'

interface IShowcaseHeroSectionProps {
  featuredProduct?: IProduct
}

const BENEFITS = [
  {
    Icon: Lightbulb,
    text: 'Ideas que empiezan en tus manos',
  },
  {
    Icon: Heart,
    text: 'Detalles únicos para cada rincón',
  },
  {
    Icon: Sparkles,
    text: 'Arte para crear, decorar y regalar',
  },
]

export function ShowcaseHeroSection({ featuredProduct }: IShowcaseHeroSectionProps) {
  const featuredDescription =
    featuredProduct?.description ??
    'Descubrí piezas con personalidad para sumar calidez a tus espacios.'
  const featuredName = featuredProduct?.name ?? 'Piezas que cuentan historias'

  return (
    <Section
      aria-labelledby="landing-showcase-title"
      background="muted"
      className="landing-showcase-hero"
    >
      <Container className="landing-showcase-hero__inner">
        <div className="landing-showcase-hero__content">
          <Typography id="landing-showcase-title" variant="h1">
            Elegí lo que te inspira
          </Typography>
          <Typography className="landing-showcase-hero__description">
            Encontrá materiales para crear y detalles listos para decorar.
          </Typography>

          <ul className="landing-showcase-hero__benefits">
            {BENEFITS.map(({ Icon, text }) => (
              <li className="landing-showcase-hero__benefit" key={text}>
                <span className="landing-showcase-hero__benefit-icon">
                  <Icon aria-hidden="true" size={20} strokeWidth={2} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <Link
            className="ui-button ui-button--primary ui-button--large landing-showcase-hero__cta"
            to="/productos"
          >
            <span>Descubrir productos</span>
            <ArrowRight aria-hidden="true" size={20} strokeWidth={2} />
          </Link>
        </div>

        <div className="landing-showcase-hero__visual">
          <div className="landing-showcase-hero__picture">
            <img
              alt="Jarrones decorativos modelados y pintados a mano bajo luz natural"
              className="landing-showcase-hero__image"
              decoding="async"
              fetchPriority="high"
              height="800"
              loading="eager"
              sizes="(max-width: 767px) calc(100vw - 2rem), 50vw"
              src={heroImage}
              srcSet={`${heroImageSmall} 480w, ${heroImage} 800w`}
              width="800"
            />
          </div>

          <article aria-label="Producto destacado" className="landing-showcase-hero__feature">
            <Badge className="landing-showcase-hero__badge" variant="success">
              <Star aria-hidden="true" fill="currentColor" size={14} strokeWidth={2} />
              Destacado
            </Badge>
            <Typography as="h2" className="landing-showcase-hero__feature-title" variant="h3">
              {featuredName}
            </Typography>
            <Typography className="landing-showcase-hero__feature-description" variant="small">
              {featuredDescription}
            </Typography>
            {featuredProduct ? (
              <Typography className="landing-showcase-hero__price" variant="body">
                {formatPrice(featuredProduct.price)}
              </Typography>
            ) : null}
            <Link
              aria-label={`Ver más sobre ${featuredName}`}
              className="ui-button ui-button--primary ui-button--small landing-showcase-hero__feature-link"
              to="/productos?area=decoraciones"
            >
              <span>Ver más</span>
              <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
            </Link>
          </article>
        </div>
      </Container>
    </Section>
  )
}
