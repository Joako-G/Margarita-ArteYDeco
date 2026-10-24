import { describe, expect, it, vi } from 'vitest'

import { AdminOrderRepository } from '../repositories/admin-orders.repository.js'

describe('admin inventory allocation projection', () => {
  it('selects the latest attempt and preserves its original deadline without a provider ID', async () => {
    const id = '3a2b9148-7dbf-4b88-a47f-296205f5e4de'
    const latestId = 'b2c2e6a7-3f1d-4f6f-9a0e-9fbc7d1d9b4b'
    const attempt = (attemptId: string, createdAt: string, expiresAt: string): Record<string, string | null> => ({
      id: attemptId, created_at: createdAt, updated_at: createdAt,
      provider_payment_id: null, provider_status: null, provider_updated_at: null,
      reservation_expires_at: expiresAt, status: 'manual_review',
    })
    const row = {
      id, order_number: 'M-1001', customer_first_name: 'Test', customer_last_name: 'Customer',
      customer_phone: '5491155551234', customer_phone_normalized: '5491155551234',
      status: 'pending', subtotal: 100, discount: 0, total: 100,
      payment_method: 'mercado_pago', payment_status: 'pending', delivery_method: 'pickup',
      shipping_address: null, contract_concluded_at: null, picked_up_at: null, delivered_at: null,
      notes: null, created_at: '2026-08-03T12:00:00.000Z', updated_at: '2026-08-03T12:00:00.000Z',
      order_items: [{ count: 1 }], inventory_movements: [],
      payment_attempts: [
        attempt(latestId, '2026-08-04T12:00:00.000Z', '2026-08-05T12:00:00.000Z'),
        attempt('c2c2e6a7-3f1d-4f6f-9a0e-9fbc7d1d9b4b', '2026-08-03T12:00:00.000Z', '2026-08-04T12:00:00.000Z'),
      ],
    }
    const orderQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })) }
    const transactionsQuery = { select: vi.fn().mockReturnThis(),
      in: vi.fn(async () => ({ data: [
        { payment_attempt_id: latestId, amount: 100, status: 'approved', review_required: false },
      ], error: null })) }
    const repository = new AdminOrderRepository({ from: vi.fn((table: string) => table === 'orders' ? orderQuery : transactionsQuery) } as never)
    const result = await repository.findById(id)
    expect(result).toMatchObject({
      paymentAttemptId: latestId, paymentAttemptStatus: 'manual_review', paymentProviderId: null,
      paymentStatus: 'paid', persistedPaymentStatus: 'pending',
      reservationExpiresAt: '2026-08-05T12:00:00.000Z',
    })
  })

  it.each([
    { movements: [-1], active: true },
    { movements: [-1, 1], active: false },
    { movements: [-1, 1, -1], active: true },
    { movements: [-1, 1, -1, 1], active: false },
  ])('derives current allocation from the signed ledger $movements', async ({ movements, active }) => {
    const id = '3a2b9148-7dbf-4b88-a47f-296205f5e4de'
    const row = {
      id, order_number: 'M-1001', customer_first_name: 'Test', customer_last_name: 'Customer',
      customer_phone: '5491155551234', customer_phone_normalized: '5491155551234',
      status: 'pending', subtotal: 100, discount: 0, total: 100,
      payment_method: 'mercado_pago', payment_status: 'paid', delivery_method: 'pickup',
      shipping_address: null, contract_concluded_at: null, picked_up_at: null, delivered_at: null,
      notes: null, created_at: '2026-08-03T12:00:00.000Z', updated_at: '2026-08-03T12:00:00.000Z',
      order_items: [{ count: 1 }], payment_attempts: [],
      inventory_movements: movements.map((quantity_delta, index) => ({
        product_id: id, quantity_delta,
        movement_type: ['order_created', 'payment_reservation_released', 'payment_re_reserved', 'order_cancelled'][index],
      })),
    }
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })) }
    const repository = new AdminOrderRepository({ from: vi.fn(() => query) } as never)
    expect((await repository.findById(id))?.inventoryAllocationActive).toBe(active)
  })
})
