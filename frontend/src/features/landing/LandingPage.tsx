import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCatalog } from '@/features/catalog'
import { useSyncCartProducts } from '@/features/cart'
import { faqMock, galleryMock, testimonialsMock } from '@/mocks'
import type { ICategory, IProduct } from '@/shared/types/catalog'

import { AboutSection } from './components/AboutSection'
import { BenefitsSection } from './components/BenefitsSection'
import { CategoriesSection } from './components/CategoriesSection'
import { FaqSection } from './components/FaqSection'
import { FeaturedProductsSection } from './components/FeaturedProductsSection'
import { FinalCtaSection } from './components/FinalCtaSection'
import { GallerySection } from './components/GallerySection'
import { HeroSection } from './components/HeroSection'
import { InspirationSection } from './components/InspirationSection'
import { TestimonialsSection } from './components/TestimonialsSection'
import './landing.css'

const EMPTY_CATEGORIES: ICategory[] = []
const EMPTY_PRODUCTS: IProduct[] = []

export function LandingPage() {
  const navigate = useNavigate()
  const { data } = useCatalog()
  const categories = data?.categories ?? EMPTY_CATEGORIES
  const products = data?.products ?? EMPTY_PRODUCTS

  useSyncCartProducts(data?.products)

  const activeCategories = useMemo(
    () =>
      categories
        .filter((category) => category.isActive)
        .sort((first, second) => first.displayOrder - second.displayOrder),
    [categories],
  )

  const featuredProducts = useMemo(() => {
    return products.filter((product) => product.isActive && product.isFeatured)
  }, [products])
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

  function selectCategory(slug: string) {
    navigate(slug === 'all' ? '/productos' : `/categoria/${slug}`)
  }

  return (
    <main id="main-content">
      <HeroSection />
      <BenefitsSection />
      <CategoriesSection
        categories={activeCategories}
        onSelect={selectCategory}
        productCountByCategory={productCountByCategory}
        selectedSlug="all"
      />
      <FeaturedProductsSection products={featuredProducts} />
      <InspirationSection />
      <GallerySection items={galleryMock} />
      <AboutSection />
      <TestimonialsSection testimonials={testimonialsMock} />
      <FaqSection items={faqMock} />
      <FinalCtaSection />
    </main>
  )
}
