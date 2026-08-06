import { useMemo } from 'react'
import { PackageOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useCatalog } from '@/features/catalog'
import { ProductCardSkeleton } from '@/features/products'
import { faqMock, testimonialsMock } from '@/mocks'
import { Button, Container, EmptyState, Section, Typography } from '@/shared/components'
import type { CatalogAreaType, ICategory, IProduct } from '@/shared/types/catalog'

import { BenefitsSection } from './components/BenefitsSection'
import { CategoriesSection } from './components/CategoriesSection'
import { FaqSection } from './components/FaqSection'
import { FeaturedProductsSection } from './components/FeaturedProductsSection'
import { FinalCtaSection } from './components/FinalCtaSection'
import { HeroSection } from './components/HeroSection'
import { TestimonialsSection } from './components/TestimonialsSection'
import './landing.css'

const EMPTY_CATEGORIES: ICategory[] = []
const EMPTY_PRODUCTS: IProduct[] = []

export function LandingPage() {
  const navigate = useNavigate()
  const { data, isError, isPending, refetch } = useCatalog()
  const categories = data?.categories ?? EMPTY_CATEGORIES
  const products = data?.products ?? EMPTY_PRODUCTS

  const activeCategories = useMemo(
    () =>
      categories
        .filter((category) => category.isActive)
        .sort((first, second) => first.displayOrder - second.displayOrder),
    [categories],
  )
  const categoryById = useMemo(
    () => new Map(activeCategories.map((category) => [category.id, category])),
    [activeCategories],
  )
  const featuredProductsByArea = useMemo(() => {
    const featuredProducts: Record<CatalogAreaType, IProduct[]> = {
      art: [],
      decoration: [],
    }

    products.forEach((product) => {
      const category = categoryById.get(product.categoryId)

      if (product.isActive && product.isFeatured && category) {
        featuredProducts[category.catalogArea].push(product)
      }
    })

    return featuredProducts
  }, [categoryById, products])
  const productCountByCategory = useMemo(
    () =>
      products
        .filter((product) => product.isActive)
        .reduce<Record<string, number>>((counts, product) => {
          counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1
          return counts
        }, {}),
    [products],
  )

  function selectCategory(area: CatalogAreaType, slug: string) {
    if (slug === 'all') {
      const areaQuery = area === 'art' ? 'arte' : 'decoraciones'
      navigate(`/productos?area=${areaQuery}`)
      return
    }

    navigate(`/categoria/${slug}`)
  }

  return (
    <main id="main-content">
      <HeroSection />
      {isPending ? (
        <Section aria-label="Cargando catálogo" background="muted">
          <Container>
            <div aria-busy="true" className="landing-catalog-loading" role="status">
              <div className="landing-section-heading">
                <Typography variant="h2">Estamos preparando el catálogo</Typography>
                <Typography>En un momento vas a poder explorar todas las opciones.</Typography>
              </div>
              <div className="landing-products__grid">
                {Array.from({ length: 3 }, (_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            </div>
          </Container>
        </Section>
      ) : isError ? (
        <Section aria-label="No se pudo cargar el catálogo" background="muted">
          <Container>
            <EmptyState
              action={<Button onClick={() => refetch()}>Reintentar</Button>}
              description="Intentá nuevamente en unos minutos."
              icon={<PackageOpen />}
              title="Ocurrió un problema al cargar el catálogo."
            />
          </Container>
        </Section>
      ) : (
        <>
          <CategoriesSection
            categories={activeCategories}
            onSelect={selectCategory}
            productCountByCategory={productCountByCategory}
          />
          <FeaturedProductsSection
            area="art"
            catalogHref="/productos?area=arte"
            description="Materiales y objetos sin terminar elegidos para acompañar tu próximo proyecto."
            id="arte-destacado"
            products={featuredProductsByArea.art}
            title="Destacados de Arte"
          />
          <FeaturedProductsSection
            area="decoration"
            background="muted"
            catalogHref="/productos?area=decoraciones"
            description="Piezas terminadas por la artista, listas para decorar o hacer un regalo especial."
            id="decoraciones-destacadas"
            products={featuredProductsByArea.decoration}
            title="Decoraciones destacadas"
          />
        </>
      )}
      <BenefitsSection />
      <TestimonialsSection testimonials={testimonialsMock} />
      <FaqSection items={faqMock} />
      <FinalCtaSection />
    </main>
  )
}
