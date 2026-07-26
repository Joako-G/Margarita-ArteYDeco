import { PackageOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ProductCard } from '@/features/products'
import type { IProduct } from '@/shared/types/catalog'
import { Container, EmptyState, Section, Typography } from '@/shared/components'

interface IFeaturedProductsSectionProps {
  products: IProduct[]
}

export function FeaturedProductsSection({ products }: IFeaturedProductsSectionProps) {
  return (
    <Section aria-labelledby="featured-title" className="landing-products" id="productos">
      <Container>
        <div className="landing-section-heading landing-section-heading--split">
          <div>
            <Typography id="featured-title" variant="h2">
              Elegidos para inspirarte
            </Typography>
            <Typography>
              Una pequeña selección para empezar a imaginar todo lo que podés crear.
            </Typography>
          </div>
          <Link className="landing-products__catalog-link" to="/productos">
            Ver catálogo completo
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="landing-products__grid">
            {products.slice(0, 3).map((product) => (
              <ProductCard headingLevel="h3" key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            description="Probá explorando otra sección."
            icon={<PackageOpen />}
            title="Todavía no encontramos productos para esta categoría."
          />
        )}
      </Container>
    </Section>
  )
}
