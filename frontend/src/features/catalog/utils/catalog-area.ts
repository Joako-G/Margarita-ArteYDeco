import type { CatalogAreaType, ICategory } from '@/shared/types/catalog'

export type CatalogAreaFilterType = CatalogAreaType | 'all'

const AREA_QUERY_VALUES: Record<CatalogAreaType, string> = {
  art: 'arte',
  decoration: 'decoraciones',
}

export function parseCatalogArea(value: string | null): CatalogAreaType | null {
  if (value === AREA_QUERY_VALUES.art) return 'art'
  if (value === AREA_QUERY_VALUES.decoration) return 'decoration'
  return null
}

export function getCatalogAreaQuery(area: CatalogAreaType) {
  return AREA_QUERY_VALUES[area]
}

export function filterCategoriesByArea(categories: ICategory[], area: CatalogAreaFilterType) {
  return area === 'all'
    ? categories
    : categories.filter((category) => category.catalogArea === area)
}
