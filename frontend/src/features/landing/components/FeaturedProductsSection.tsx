import { PackageOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ProductCard } from '@/features/products'
import { Container, EmptyState, Section, Typography } from '@/shared/components'
import type { CatalogAreaType, IProduct } from '@/shared/types/catalog'

interface IFeaturedProductsSectionProps {
  area: CatalogAreaType
  background?: 'default' | 'muted'
  catalogHref: string
  description: string
  id: string
  products: IProduct[]
  title: string
}

export function FeaturedProductsSection({
  area,
  background = 'default',
  catalogHref,
  description,
  id,
  products,
  title,
}: IFeaturedProductsSectionProps) {
  const titleId = `${id}-title`

  return (
    <Section aria-labelledby={titleId} background={background} className="landing-products" id={id}>
      <Container>
        <div className="landing-section-heading landing-section-heading--split">
          <div>
            <Typography id={titleId} variant="h2">
              {title}
            </Typography>
            <Typography>{description}</Typography>
          </div>
          <Link className="landing-products__catalog-link" to={catalogHref}>
            Ver todos
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="landing-products__grid">
            {products.slice(0, 3).map((product) => (
              <ProductCard
                catalogArea={area}
                headingLevel="h3"
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            description="Volvé a visitarnos pronto para descubrir nuevas opciones."
            icon={<PackageOpen />}
            title="Estamos preparando nuevos productos para esta sección."
          />
        )}
      </Container>
    </Section>
  )
}
