import type {
  AdminOrderSortType,
  AdminPaymentMethodType,
  AdminPaymentStatusType,
  IAdminOrderFilters,
} from '../types/admin-orders'
import type { OrderStatusType } from '@/shared/utils/order-status'

export const DEFAULT_ADMIN_ORDER_FILTERS: IAdminOrderFilters = {
  page: 1,
  pageSize: 10,
  paymentMethod: 'all',
  paymentStatus: 'all',
  sort: 'newest',
  status: 'all',
}

const METHODS: readonly ('all' | AdminPaymentMethodType)[] = ['all', 'bank_transfer', 'cash']
const PAYMENT_STATUSES: readonly ('all' | AdminPaymentStatusType)[] = [
  'all', 'paid', 'pending', 'rejected',
]
const STATUSES: readonly ('all' | OrderStatusType)[] = [
  'all', 'cancelled', 'confirmed', 'delivered', 'pending', 'picked_up', 'preparing', 'ready',
]
const SORTS: readonly AdminOrderSortType[] = ['newest', 'oldest', 'totalAsc', 'totalDesc']
const PAGE_SIZES = [10, 20, 50] as const

function isOneOf<T extends string>(value: string | null, values: readonly T[]): value is T {
  return value !== null && values.includes(value as T)
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  return parsed >= 1 ? parsed : fallback
}

export function parseAdminOrderFilters(searchParams: URLSearchParams): IAdminOrderFilters {
  const rawPageSize = parsePositiveInteger(searchParams.get('pageSize'), 10)
  const paymentMethod = searchParams.get('paymentMethod')
  const paymentStatus = searchParams.get('paymentStatus')
  const search = searchParams.get('search')?.trim()
  const sort = searchParams.get('sort')
  const status = searchParams.get('status')

  return {
    page: Math.min(parsePositiveInteger(searchParams.get('page'), 1), 10_000),
    pageSize: PAGE_SIZES.includes(rawPageSize as (typeof PAGE_SIZES)[number]) ? rawPageSize : 10,
    paymentMethod: isOneOf(paymentMethod, METHODS) ? paymentMethod : 'all',
    paymentStatus: isOneOf(paymentStatus, PAYMENT_STATUSES) ? paymentStatus : 'all',
    ...(search && search.length >= 2 && search.length <= 80 ? { search } : {}),
    sort: isOneOf(sort, SORTS) ? sort : 'newest',
    status: isOneOf(status, STATUSES) ? status : 'all',
  }
}

export function buildAdminOrderSearchParams(filters: IAdminOrderFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.pageSize !== 10) params.set('pageSize', String(filters.pageSize))
  if (filters.paymentMethod !== 'all') params.set('paymentMethod', filters.paymentMethod)
  if (filters.paymentStatus !== 'all') params.set('paymentStatus', filters.paymentStatus)
  if (filters.search) params.set('search', filters.search)
  if (filters.sort !== 'newest') params.set('sort', filters.sort)
  if (filters.status !== 'all') params.set('status', filters.status)
  return params
}
