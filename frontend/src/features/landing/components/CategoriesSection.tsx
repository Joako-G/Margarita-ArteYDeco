import { CategoryFilter } from '@/features/categories'
import type { ICategory } from '@/shared/types/catalog'
import { Container, Section, Typography } from '@/shared/components'

interface ICategoriesSectionProps {
  categories: ICategory[]
  onSelect: (slug: string) => void
  productCountByCategory: Record<string, number>
  selectedSlug: string
}

export function CategoriesSection({
  categories,
  onSelect,
  productCountByCategory,
  selectedSlug,
}: ICategoriesSectionProps) {
  const selectedCategory = categories.find((category) => category.slug === selectedSlug)
  const selectionLabel = selectedCategory
    ? `Estás viendo: ${selectedCategory.name}`
    : 'Todos los productos'

  return (
    <Section
      aria-labelledby="categories-title"
      background="muted"
      className="landing-categories"
      id="categorias"
    >
      <Container>
        <div className="landing-section-heading">
          <Typography id="categories-title" variant="h2">
            Encontrá lo que necesitás
          </Typography>
          <Typography>
            Explorá por categoría y descubrí materiales para tu próximo proyecto.
          </Typography>
        </div>

        <CategoryFilter
          categories={categories}
          onSelect={onSelect}
          productCountByCategory={productCountByCategory}
          selectedSlug={selectedSlug}
        />

        <p aria-live="polite" className="landing-categories__selection">
          {selectionLabel}
        </p>
      </Container>
    </Section>
  )
}
