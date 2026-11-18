// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ADMIN_DASHBOARD_QUERY_KEY } from '@/features/admin-dashboard/hooks/useAdminDashboard'
import { ADMIN_INVENTORY_QUERY_KEY } from '@/features/admin-inventory/hooks/useAdminInventory'
import { ADMIN_PRODUCTS_QUERY_KEY } from '@/features/admin-products/hooks/useAdminProducts'
import { CATALOG_QUERY_KEY } from '@/features/catalog/hooks/useCatalog'

import { adminOrdersService } from '../services/admin-orders.service'
import type { IAdminOrderDetail } from '../types/admin-orders'
import { ADMIN_ORDERS_QUERY_KEY, ADMIN_PAYMENT_RECONCILIATION_QUERY_KEY } from './useAdminOrders'
import { useAdminPaymentConsultation } from './useAdminPaymentConsultation'

vi.mock('../services/admin-orders.service', () => ({
  adminOrdersService: { executePaymentAction: vi.fn(), getOrder: vi.fn() },
}))

const VARIABLES = { attemptId: 'attempt-1', orderId: 'order-1' }
const REFRESHED_ORDER = { id: 'order-1', paymentStatus: 'paid', status: 'pending' } as IAdminOrderDetail

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  return { invalidate, ...renderHook(() => useAdminPaymentConsultation(), { wrapper }) }
}

describe('useAdminPaymentConsultation', () => {
  beforeEach(() => {
    vi.mocked(adminOrdersService.executePaymentAction).mockReset()
    vi.mocked(adminOrdersService.getOrder).mockReset()
    vi.mocked(adminOrdersService.getOrder).mockResolvedValue(REFRESHED_ORDER)
  })

  it('consults the provider through the attempt and then reads the authoritative order', async () => {
    vi.mocked(adminOrdersService.executePaymentAction).mockResolvedValue({ auditRecorded: true })
    const { result } = setup()

    await act(() => result.current.mutateAsync(VARIABLES))

    expect(adminOrdersService.executePaymentAction).toHaveBeenCalledWith('attempt-1', 'sync')
    expect(adminOrdersService.getOrder).toHaveBeenCalledWith('order-1')
    await waitFor(() =>
      expect(result.current.data).toEqual({
        auditRecorded: true,
        order: REFRESHED_ORDER,
        syncError: null,
      }),
    )
  })

  it('still returns the refreshed order when the provider consultation fails', async () => {
    const failure = new Error('provider unavailable')
    vi.mocked(adminOrdersService.executePaymentAction).mockRejectedValue(failure)
    const { result } = setup()

    await act(() => result.current.mutateAsync(VARIABLES))

    await waitFor(() =>
      expect(result.current.data).toEqual({
        auditRecorded: null,
        order: REFRESHED_ORDER,
        syncError: failure,
      }),
    )
  })

  it('refreshes orders, reconciliation, stock, products, dashboard and catalog after consulting', async () => {
    vi.mocked(adminOrdersService.executePaymentAction).mockResolvedValue({ auditRecorded: true })
    const { invalidate, result } = setup()

    await act(() => result.current.mutateAsync(VARIABLES))

    await waitFor(() => {
      const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey)
      expect(keys).toEqual(
        expect.arrayContaining([
          ADMIN_ORDERS_QUERY_KEY,
          ADMIN_PAYMENT_RECONCILIATION_QUERY_KEY,
          ADMIN_INVENTORY_QUERY_KEY,
          ADMIN_PRODUCTS_QUERY_KEY,
          ADMIN_DASHBOARD_QUERY_KEY,
          CATALOG_QUERY_KEY,
        ]),
      )
      expect(keys).toHaveLength(6)
    })
  })

  it('refreshes the same data even when reading the order fails', async () => {
    vi.mocked(adminOrdersService.executePaymentAction).mockResolvedValue({ auditRecorded: true })
    vi.mocked(adminOrdersService.getOrder).mockRejectedValue(new Error('order unavailable'))
    const { invalidate, result } = setup()

    await act(() => result.current.mutateAsync(VARIABLES).catch(() => undefined))

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(6))
    expect(result.current.isError).toBe(true)
  })
})
