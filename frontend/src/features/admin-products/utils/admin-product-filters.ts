import type {
  AdminProductPublicationFilterType,
  AdminProductSortType,
  AdminProductStockFilterType,
  IAdminProductFilters,
} from '../types/admin-products'

export const DEFAULT_ADMIN_PRODUCT_FILTERS: IAdminProductFilters = {
  page: 1,
  pageSize: 10,
  publication: 'all',
  sort: 'newest',
  stock: 'all',
}

const PUBLICATION_FILTERS: readonly AdminProductPublicationFilterType[] = [
  'active',
  'all',
  'inactive',
]
const STOCK_FILTERS: readonly AdminProductStockFilterType[] = [
  'all',
  'inStock',
  'lowStock',
  'outOfStock',
]
const SORT_OPTIONS: readonly AdminProductSortType[] = [
  'nameAsc',
  'nameDesc',
  'newest',
  'priceAsc',
  'priceDesc',
  'stockAsc',
  'stockDesc',
]
const PAGE_SIZES = [10, 20, 50] as const

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback

  const parsedValue = Number(value)
  return parsedValue >= 1 ? parsedValue : fallback
}

function isOneOf<T extends string>(value: string | null, values: readonly T[]): value is T {
  return value !== null && values.includes(value as T)
}

export function parseAdminProductFilters(searchParams: URLSearchParams): IAdminProductFilters {
  const rawPageSize = parsePositiveInteger(searchParams.get('pageSize'), 10)
  const search = searchParams.get('search')?.trim()
  const publication = searchParams.get('publication')
  const stock = searchParams.get('stock')
  const sort = searchParams.get('sort')

  return {
    page: Math.min(parsePositiveInteger(searchParams.get('page'), 1), 10_000),
    pageSize: PAGE_SIZES.includes(rawPageSize as (typeof PAGE_SIZES)[number]) ? rawPageSize : 10,
    publication: isOneOf(publication, PUBLICATION_FILTERS) ? publication : 'all',
    ...(search && search.length >= 2 && search.length <= 80 ? { search } : {}),
    sort: isOneOf(sort, SORT_OPTIONS) ? sort : 'newest',
    stock: isOneOf(stock, STOCK_FILTERS) ? stock : 'all',
  }
}

export function buildAdminProductSearchParams(filters: IAdminProductFilters): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (filters.page > 1) searchParams.set('page', String(filters.page))
  if (filters.pageSize !== 10) searchParams.set('pageSize', String(filters.pageSize))
  if (filters.publication !== 'all') searchParams.set('publication', filters.publication)
  if (filters.search) searchParams.set('search', filters.search)
  if (filters.sort !== 'newest') searchParams.set('sort', filters.sort)
  if (filters.stock !== 'all') searchParams.set('stock', filters.stock)

  return searchParams
}
