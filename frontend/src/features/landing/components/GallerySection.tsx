import type { IGalleryItem } from '@/shared/types/content'
import { Container, Section, Typography } from '@/shared/components'

interface IGallerySectionProps {
  items: IGalleryItem[]
}

export function GallerySection({ items }: IGallerySectionProps) {
  return (
    <Section aria-labelledby="gallery-title" className="landing-gallery">
      <Container>
        <div className="landing-section-heading">
          <Typography id="gallery-title" variant="h2">
            Ideas que toman forma
          </Typography>
          <Typography>
            Materiales, texturas y herramientas que invitan a probar algo nuevo.
          </Typography>
        </div>
        <div className="landing-gallery__grid">
          {items.map((item) => (
            <figure
              className={`landing-gallery__item landing-gallery__item--${item.size}`}
              key={item.id}
            >
              <img alt={item.alt} height="900" loading="lazy" src={item.image} width="900" />
              <figcaption>{item.title}</figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  )
}
