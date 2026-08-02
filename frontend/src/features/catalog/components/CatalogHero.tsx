import { Container, Section, Typography } from '@/shared/components'

export function CatalogHero() {
  return (
    <Section aria-labelledby="catalog-title" background="muted" className="catalog-page__hero">
      <Container>
        <div className="catalog-page__heading">
          <Typography as="h1" id="catalog-title" variant="h1">
            Nuestros Productos
          </Typography>
          <Typography>
            Descubrí piezas únicas hechas a mano, materiales para crear y decoraciones listas para
            regalar o disfrutar en tu hogar.
          </Typography>
        </div>
      </Container>
    </Section>
  )
}
