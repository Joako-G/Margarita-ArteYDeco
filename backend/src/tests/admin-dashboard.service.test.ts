import { describe, expect, it, vi } from 'vitest'

import type { IAdminDashboardRepository } from '../repositories/admin-dashboard.repository.js'
import { AdminDashboardService } from '../services/admin-dashboard.service.js'

const SNAPSHOT = {
  lowStockProducts: [
    {
      id: 'bd62774b-7863-4fb4-a041-60d9003a4432',
      name: 'Cuadro botánico',
      stockQuantity: 2,
    },
  ],
  metrics: {
    activeProducts: 14,
    categories: 12,
    completedOrders: 3,
    customers: 8,
    lowStockProducts: 2,
    openOrders: 4,
    outOfStockProducts: 1,
  },
  recentOrders: [
    {
      createdAt: '2026-08-02T15:30:00.000Z',
      customerFirstName: 'Ana',
      customerLastName: 'Pérez',
      orderNumber: 'MAD-20260802-000001',
      paymentMethod: 'bank_transfer' as const,
      status: 'payment_pending' as const,
      total: 25_000,
    },
  ],
}

describe('AdminDashboardService', () => {
  it('maps the operational snapshot to the public admin contract', async () => {
    const repository: IAdminDashboardRepository = {
      getSnapshot: vi.fn().mockResolvedValue(SNAPSHOT),
    }
    const service = new AdminDashboardService(repository)

    await expect(service.getSummary()).resolves.toEqual({
      lowStockProducts: SNAPSHOT.lowStockProducts,
      metrics: SNAPSHOT.metrics,
      recentOrders: [
        {
          createdAt: '2026-08-02T15:30:00.000Z',
          customerName: 'Ana Pérez',
          orderNumber: 'MAD-20260802-000001',
          paymentMethod: 'bank_transfer',
          status: 'payment_pending',
          total: 25_000,
        },
      ],
    })
  })

  it('propagates data-source errors to the centralized error middleware', async () => {
    const repository: IAdminDashboardRepository = {
      getSnapshot: vi.fn().mockRejectedValue(new Error('data source unavailable')),
    }
    const service = new AdminDashboardService(repository)

    await expect(service.getSummary()).rejects.toThrow('data source unavailable')
  })
})
