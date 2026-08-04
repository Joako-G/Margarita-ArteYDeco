import type { AdminCustomerSortType, IAdminCustomerFilters } from '../types/admin-customers'

export const DEFAULT_ADMIN_CUSTOMER_FILTERS: IAdminCustomerFilters = {
  page: 1,
  pageSize: 10,
  sort: 'nameAsc',
}

const SORTS: readonly AdminCustomerSortType[] = ['nameAsc', 'nameDesc', 'newest', 'oldest']
const PAGE_SIZES = [10, 20, 50] as const

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  return parsed >= 1 ? parsed : fallback
}

export function parseAdminCustomerFilters(searchParams: URLSearchParams): IAdminCustomerFilters {
  const rawPageSize = parsePositiveInteger(searchParams.get('pageSize'), 10)
  const search = searchParams.get('search')?.trim()
  const sort = searchParams.get('sort')
  return {
    page: Math.min(parsePositiveInteger(searchParams.get('page'), 1), 10_000),
    pageSize: PAGE_SIZES.includes(rawPageSize as (typeof PAGE_SIZES)[number]) ? rawPageSize : 10,
    ...(search && search.length >= 2 && search.length <= 80 ? { search } : {}),
    sort: SORTS.includes(sort as AdminCustomerSortType) ? sort as AdminCustomerSortType : 'nameAsc',
  }
}

export function buildAdminCustomerSearchParams(filters: IAdminCustomerFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.pageSize !== 10) params.set('pageSize', String(filters.pageSize))
  if (filters.search) params.set('search', filters.search)
  if (filters.sort !== 'nameAsc') params.set('sort', filters.sort)
  return params
}
