import type { CatalogAreaType, ICategory } from '@/shared/types/catalog'

export type CatalogAreaFilterType = CatalogAreaType | 'all'

export interface ICatalogMenuLink {
  href: string
  label: string
}

export interface ICatalogMenuGroup {
  id: string
  items: CatalogMenuNodeType[]
  label: string
}

export type CatalogMenuNodeType = ICatalogMenuGroup | ICatalogMenuLink

const AREA_QUERY_VALUES: Record<CatalogAreaType, string> = {
  art: 'arte',
  decoration: 'decoraciones',
}

const AREA_LABELS: Record<CatalogAreaType, string> = {
  art: 'Arte',
  decoration: 'Decoraciones',
}

const MENU_AREAS: CatalogAreaType[] = ['art', 'decoration']

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

export function isCatalogMenuGroup(node: CatalogMenuNodeType): node is ICatalogMenuGroup {
  return 'items' in node
}

export function buildCatalogMenu(categories: ICategory[]): CatalogMenuNodeType[] {
  const visibleCategories = categories
    .filter((category) => category.isActive)
    .sort((first, second) => first.displayOrder - second.displayOrder)

  return [
    { href: '/productos', label: 'Ver todo en Productos' },
    ...MENU_AREAS.map<ICatalogMenuGroup>((area) => ({
      id: `catalog-area-${area}`,
      items: [
        {
          href: `/productos?area=${AREA_QUERY_VALUES[area]}`,
          label: `Ver todo en ${AREA_LABELS[area]}`,
        },
        ...filterCategoriesByArea(visibleCategories, area).map<ICatalogMenuLink>((category) => ({
          href: `/categoria/${category.slug}`,
          label: category.name,
        })),
      ],
      label: AREA_LABELS[area],
    })),
  ]
}
