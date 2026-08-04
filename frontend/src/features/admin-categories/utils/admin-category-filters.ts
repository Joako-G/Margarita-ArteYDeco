import type {
  AdminCategoryAreaFilterType,
  AdminCategoryPublicationFilterType,
  AdminCategorySortType,
  IAdminCategoryFilters,
} from '../types/admin-categories'

export const DEFAULT_ADMIN_CATEGORY_FILTERS: IAdminCategoryFilters = {
  area: 'all',
  page: 1,
  pageSize: 10,
  publication: 'all',
  sort: 'orderAsc',
}

const AREAS: readonly AdminCategoryAreaFilterType[] = ['all', 'art', 'decoration']
const PUBLICATIONS: readonly AdminCategoryPublicationFilterType[] = ['active', 'all', 'inactive']
const SORTS: readonly AdminCategorySortType[] = [
  'nameAsc', 'nameDesc', 'newest', 'orderAsc', 'orderDesc',
]
const PAGE_SIZES = [10, 20, 50] as const

function isOneOf<T extends string>(value: string | null, values: readonly T[]): value is T {
  return value !== null && values.includes(value as T)
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  return parsed >= 1 ? parsed : fallback
}

export function parseAdminCategoryFilters(searchParams: URLSearchParams): IAdminCategoryFilters {
  const rawPageSize = parsePositiveInteger(searchParams.get('pageSize'), 10)
  const area = searchParams.get('area')
  const publication = searchParams.get('publication')
  const search = searchParams.get('search')?.trim()
  const sort = searchParams.get('sort')

  return {
    area: isOneOf(area, AREAS) ? area : 'all',
    page: Math.min(parsePositiveInteger(searchParams.get('page'), 1), 10_000),
    pageSize: PAGE_SIZES.includes(rawPageSize as (typeof PAGE_SIZES)[number]) ? rawPageSize : 10,
    publication: isOneOf(publication, PUBLICATIONS) ? publication : 'all',
    ...(search && search.length >= 2 && search.length <= 80 ? { search } : {}),
    sort: isOneOf(sort, SORTS) ? sort : 'orderAsc',
  }
}

export function buildAdminCategorySearchParams(filters: IAdminCategoryFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.area !== 'all') params.set('area', filters.area)
  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.pageSize !== 10) params.set('pageSize', String(filters.pageSize))
  if (filters.publication !== 'all') params.set('publication', filters.publication)
  if (filters.search) params.set('search', filters.search)
  if (filters.sort !== 'orderAsc') params.set('sort', filters.sort)
  return params
}
