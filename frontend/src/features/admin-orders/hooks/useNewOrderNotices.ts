import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { ADMIN_DASHBOARD_QUERY_KEY } from '@/features/admin-dashboard/hooks/useAdminDashboard'
import { getApiErrorStatus } from '@/shared/services/api/errors'

import { adminOrdersService } from '../services/admin-orders.service'
import type { IAdminOrderFilters } from '../types/admin-orders'
import type { INewOrderNotice } from '../utils/new-order-notices'
import {
  detectNewOrders,
  mergeNewOrderNotices,
  removeNotice,
  toNewOrderNotice,
} from '../utils/new-order-notices'
import { ADMIN_ORDERS_QUERY_KEY } from './useAdminOrders'

export const ADMIN_NEW_ORDERS_QUERY_KEY = ['admin', 'new-orders'] as const

const NEW_ORDER_POLL_INTERVAL = 30_000

const NEW_ORDER_FILTERS: IAdminOrderFilters = {
  page: 1,
  pageSize: 10,
  paymentMethod: 'all',
  paymentStatus: 'all',
  sort: 'newest',
  status: 'all',
}

export function useNewOrderNotices() {
  const queryClient = useQueryClient()
  const [notices, setNotices] = useState<INewOrderNotice[]>([])
  const knownOrderIdsRef = useRef<Set<string> | null>(null)
  const { data, isError } = useQuery({
    queryFn: () => adminOrdersService.getOrders(NEW_ORDER_FILTERS),
    queryKey: ADMIN_NEW_ORDERS_QUERY_KEY,
    refetchInterval: NEW_ORDER_POLL_INTERVAL,
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error)
      return failureCount < 1 && status !== 400 && status !== 401 && status !== 403
    },
    staleTime: 0,
  })

  useEffect(() => {
    if (!data) return

    const knownOrderIds = knownOrderIdsRef.current

    if (knownOrderIds === null) {
      knownOrderIdsRef.current = new Set(data.items.map((order) => order.id))
      return
    }

    const newOrders = detectNewOrders([...knownOrderIds], data.items)

    if (newOrders.length === 0) return

    newOrders.forEach((order) => knownOrderIds.add(order.id))
    setNotices((currentNotices) =>
      mergeNewOrderNotices(currentNotices, newOrders.map(toNewOrderNotice)),
    )
    void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY })
  }, [data, queryClient])

  const clearNotices = useCallback(() => {
    setNotices([])
  }, [])

  const dismissNotice = useCallback((noticeId: string) => {
    setNotices((currentNotices) => removeNotice(currentNotices, noticeId))
  }, [])

  return { clearNotices, dismissNotice, isError, notices }
}
