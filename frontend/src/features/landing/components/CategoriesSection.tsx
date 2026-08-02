import { Sprout } from 'lucide-react'

import { CategoryFilter } from '@/features/categories'
import { Container, Section, Typography } from '@/shared/components'
import type { CatalogAreaType, ICategory } from '@/shared/types/catalog'

interface ICategoriesSectionProps {
  categories: ICategory[]
  onSelect: (area: CatalogAreaType, slug: string) => void
  productCountByCategory: Record<string, number>
}

const AREA_CONTENT: Record<
  CatalogAreaType,
  { allLabel: string; description: string; title: string }
> = {
  art: {
    allLabel: 'Todo Arte',
    description: 'Materiales, herramientas y objetos sin pintar para que puedas crear a tu manera.',
    title: 'Arte para crear',
  },
  decoration: {
    allLabel: 'Todas las decoraciones',
    description: 'Piezas pintadas y terminadas a mano, listas para decorar tu hogar o regalar.',
    title: 'Decoraciones listas para disfrutar',
  },
}

export function CategoriesSection({
  categories,
  onSelect,
  productCountByCategory,
}: ICategoriesSectionProps) {
  return (
    <Section
      aria-label="Categorías"
      background="muted"
      className="landing-categories"
      id="categorias"
    >
      <Container>
        <div className="landing-categories__areas">
          {(['art', 'decoration'] as const).map((area) => {
            const areaCategories = categories.filter((category) => category.catalogArea === area)
            const content = AREA_CONTENT[area]

            return (
              <article
                aria-labelledby={`categories-${area}-title`}
                className="landing-categories__area"
                key={area}
              >
                <div className="landing-categories__area-heading">
                  <div className="landing-categories__area-title">
                    <Sprout aria-hidden="true" size={22} strokeWidth={2} />
                    <Typography as="h2" id={`categories-${area}-title`} variant="h2">
                      {content.title}
                    </Typography>
                  </div>
                  <Typography>{content.description}</Typography>
                </div>

                <CategoryFilter
                  allLabel={content.allLabel}
                  ariaLabel={`Explorar categorías de ${content.title}`}
                  categories={areaCategories}
                  onSelect={(slug) => onSelect(area, slug)}
                  productCountByCategory={productCountByCategory}
                  selectedSlug=""
                />
              </article>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
