import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { IAdminOrderRepository } from '../repositories/admin-orders.repository.js'
import type { ISettingsRepository } from '../repositories/settings.repository.js'
import { AdminOrderService } from '../services/admin-orders.service.js'
import type { IAdminOrderRecord } from '../types/admin-orders.js'

const ORDER: IAdminOrderRecord = {
  contractConcludedAt: null,
  createdAt: '2026-08-03T12:00:00.000Z',
  customerFirstName: 'Ana',
  customerLastName: 'Pérez',
  customerPhone: '+54 9 11 5555-1234',
  customerPhoneNormalized: '5491155551234',
  deliveryMethod: 'pickup',
  discount: 1200,
  deliveredAt: null,
  id: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
  itemCount: 2,
  notes: 'Retira por la tarde',
  orderNumber: 'MAD-20260803-000001',
  paymentMethod: 'bank_transfer',
  paymentProviderId: null,
  paymentProviderStatus: null,
  paymentReconciliationStatus: null,
  persistedPaymentStatus: 'pending',
  paymentStatus: 'pending',
  paymentUpdatedAt: null,
  paymentRequiresManualReview: false,
  pickedUpAt: null,
  status: 'pending',
  shippingAddress: null,
  subtotal: 12000,
  total: 10800,
  updatedAt: '2026-08-03T12:00:00.000Z',
}
const ACTOR_ID = 'bd62774b-7863-4fb4-a041-60d9003a4432'

function createRepository(overrides: Partial<IAdminOrderRepository> = {}): IAdminOrderRepository {
  return {
    cancel: vi.fn(),
    findById: vi.fn().mockResolvedValue(ORDER),
    findItems: vi.fn().mockResolvedValue([
      {
        listUnitPrice: 6000,
        productDiscountPercentage: 10,
        productName: 'Pinceles',
        quantity: 2,
        subtotal: 10800,
        unitPrice: 5400,
      },
    ]),
    findPage: vi.fn(),
    transition: vi.fn(),
    ...overrides,
  }
}

function createSettingsRepository(): ISettingsRepository {
  return {
    findPublic: vi.fn().mockResolvedValue({
      address: 'Av. Siempre Viva 123',
      businessHours: 'Lunes a viernes de 9 a 18 h',
      businessName: 'Margaritas Arte & Deco',
      facebook: null,
      id: '85d0df88-b9e0-4211-b040-efc480854b5a',
      instagram: null,
      logoPath: null,
      mapsUrl: 'https://maps.google.com/example',
      transferDiscount: 10,
      whatsapp: '+54 9 11 5555-0000',
    }),
  }
}

const logger = pino({ enabled: false })

describe('AdminOrderService', () => {
  it.each(['pending', 'confirmed', 'preparing', 'ready'] as const)(
    'does not offer or execute MP fulfillment without paid status in %s', async (status) => {
      const order: IAdminOrderRecord = {
        ...ORDER,
        inventoryAllocationActive: true,
        paymentMethod: 'mercado_pago',
        paymentStatus: 'pending',
        status,
      }
      const repository = createRepository({ findById: vi.fn().mockResolvedValue(order) })
      const service = new AdminOrderService(repository, createSettingsRepository(), logger)
      const detail = await service.getById(order.id)
      expect(detail.availableActions).toEqual([])
      const action = status === 'pending' ? 'confirmOrder'
        : status === 'confirmed' ? 'startPreparing'
          : status === 'preparing' ? 'markReady' : 'markPickedUp'
      await expect(service.executeAction(order.id, {
        action, expectedUpdatedAt: order.updatedAt,
      }, ACTOR_ID)).rejects.toMatchObject({ code: 'ORDER_ACTION_NOT_ALLOWED' })
      expect(repository.transition).not.toHaveBeenCalled()
    },
  )

  it.each(['cash', 'bank_transfer'] as const)('preserves unpaid %s order confirmation', async (paymentMethod) => {
    const order: IAdminOrderRecord = { ...ORDER, paymentMethod }
    const service = new AdminOrderService(createRepository({ findById: vi.fn().mockResolvedValue(order) }), createSettingsRepository(), logger)
    expect((await service.getById(order.id)).availableActions).toContain('confirmOrder')
  })

  it('rejects a projected approved aggregate until the persisted MP payment is paid', async () => {
    const order: IAdminOrderRecord = {
      ...ORDER,
      inventoryAllocationActive: true,
      paymentMethod: 'mercado_pago',
      paymentReconciliationStatus: 'approved',
      paymentStatus: 'paid',
      persistedPaymentStatus: 'pending',
    }
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(order) })
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    expect((await service.getById(order.id)).availableActions).not.toContain('confirmOrder')
    await expect(service.executeAction(order.id, {
      action: 'confirmOrder', expectedUpdatedAt: order.updatedAt,
    }, ACTOR_ID)).rejects.toMatchObject({ code: 'ORDER_ACTION_NOT_ALLOWED' })
    expect(repository.transition).not.toHaveBeenCalled()
  })

  it.each([
    ['expired unresolved without provider ID', '2026-09-25T10:40:00.000Z', 'manual_review', 'pending', true],
    ['active reservation', '2099-09-25T10:40:00.000Z', 'pending', 'pending', false],
    ['resolved payment', '2026-09-25T10:40:00.000Z', 'approved', 'paid', false],
  ] as const)('gates consultation for %s while preserving the original instant', async (_name, expiresAt, attemptStatus, paymentStatus, expected) => {
    const order: IAdminOrderRecord = {
      ...ORDER,
      inventoryAllocationActive: false,
      paymentAttemptId: 'b2c2e6a7-3f1d-4f6f-9a0e-9fbc7d1d9b4b',
      paymentAttemptStatus: attemptStatus,
      paymentMethod: 'mercado_pago',
      paymentStatus,
      reservationExpiresAt: expiresAt,
    }
    const service = new AdminOrderService(createRepository({ findById: vi.fn().mockResolvedValue(order) }), createSettingsRepository(), logger)
    const detail = await service.getById(order.id)
    expect(detail.canConsultPayment).toBe(expected)
    expect(detail.reservationExpiresAt).toBe(expiresAt)
    expect(detail.paymentAttemptId).toBe(order.paymentAttemptId)
    expect(detail.inventoryAllocationActive).toBe(false)
  })

  it.each(['pending', 'confirmed', 'preparing', 'ready'] as const)(
    'hides and rejects fulfillment for a released paid MP allocation in %s', async (status) => {
      const order = { ...ORDER, status, paymentMethod: 'mercado_pago' as const,
        paymentStatus: 'paid' as const, persistedPaymentStatus: 'paid' as const, inventoryAllocationActive: false }
      const repository = createRepository({ findById: vi.fn().mockResolvedValue(order) })
      const service = new AdminOrderService(repository, createSettingsRepository(), logger)
      const result = await service.getById(order.id)
      expect(result.availableActions).toEqual([])
      expect(result.canCancel).toBe(true)
      expect(result.whatsappPhone).toBeTruthy()
      await expect(service.executeAction(order.id, {
        action: 'confirmOrder', expectedUpdatedAt: order.updatedAt,
      }, ACTOR_ID)).rejects.toMatchObject({ code: 'ORDER_ACTION_NOT_ALLOWED' })
      expect(repository.transition).not.toHaveBeenCalled()
    },
  )

  it.each(['pending', 'confirmed', 'preparing', 'ready'] as const)(
    'hides and rejects fulfillment for an expired unresolved MP payment in %s', async (status) => {
      const order = { ...ORDER, status, paymentMethod: 'mercado_pago' as const,
        paymentStatus: 'pending' as const, persistedPaymentStatus: 'pending' as const,
        paymentAttemptId: 'f6a1c2d3-1b2c-4d5e-8f90-a1b2c3d4e5f6', paymentAttemptStatus: 'manual_review' as const,
        paymentRequiresManualReview: true, inventoryAllocationActive: false }
      const repository = createRepository({ findById: vi.fn().mockResolvedValue(order) })
      const service = new AdminOrderService(repository, createSettingsRepository(), logger)
      expect((await service.getById(order.id)).availableActions).toEqual([])
      for (const action of ['confirmOrder', 'confirmPayment', 'startPreparing', 'markReady', 'markPickedUp', 'markDelivered'] as const) {
        await expect(service.executeAction(order.id, {
          action, expectedUpdatedAt: order.updatedAt,
        }, ACTOR_ID)).rejects.toMatchObject({ code: 'ORDER_ACTION_NOT_ALLOWED' })
      }
      expect(repository.transition).not.toHaveBeenCalled()
    },
  )

  it.each(['cash', 'bank_transfer', 'mercado_pago'] as const)(
    'preserves confirmation with held inventory for %s', async (paymentMethod) => {
      const order = { ...ORDER, paymentMethod, paymentStatus: 'paid' as const,
        persistedPaymentStatus: 'paid' as const, inventoryAllocationActive: true }
      const repository = createRepository({ findById: vi.fn().mockResolvedValue(order) })
      const service = new AdminOrderService(repository, createSettingsRepository(), logger)
      expect((await service.getById(order.id)).availableActions).toContain('confirmOrder')
    },
  )
  it('returns a paginated list without exposing normalized phone snapshots', async () => {
    const repository = createRepository({
      findPage: vi.fn().mockResolvedValue({ items: [ORDER], totalItems: 12 }),
    })
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    const result = await service.list({
      page: 1,
      pageSize: 10,
      paymentMethod: 'all',
      paymentStatus: 'all',
      sort: 'newest',
      status: 'all',
    })

    expect(result.pagination).toMatchObject({ totalItems: 12, totalPages: 2 })
    expect(result.items[0]).toMatchObject({ orderNumber: ORDER.orderNumber, itemCount: 2 })
    expect(JSON.stringify(result)).not.toContain('customerPhoneNormalized')
  })

  it('returns payment reconciliation details independently from order status', async () => {
    const order = {
      ...ORDER,
      paymentMethod: 'mercado_pago' as const,
      paymentProviderId: '123456789',
      paymentProviderStatus: 'approved',
      paymentReconciliationStatus: 'approved' as const,
      paymentStatus: 'paid' as const,
      paymentUpdatedAt: '2026-08-03T12:05:00.000Z',
      paymentRequiresManualReview: false,
    }
    const repository = createRepository({ findPage: vi.fn().mockResolvedValue({ items: [order], totalItems: 1 }) })
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    const result = await service.list({
      page: 1,
      pageSize: 10,
      paymentMethod: 'all',
      paymentStatus: 'all',
      sort: 'newest',
      status: 'all',
    })

    expect(result.items[0]).toMatchObject({
      paymentProviderId: '123456789',
      paymentReconciliationStatus: 'approved',
      paymentStatus: 'paid',
      paymentUpdatedAt: order.paymentUpdatedAt,
    })
    expect(result.items[0]?.status).toBe('pending')
  })

  it('does not expose manual payment confirmation for Mercado Pago', async () => {
    const order = {
      ...ORDER,
      paymentMethod: 'mercado_pago' as const,
      paymentReconciliationStatus: 'pending' as const,
    }
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(order) })
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    const result = await service.getById(order.id)

    expect(result.availableActions).not.toContain('confirmPayment')
  })

  it('exposes the administrative dates used to review a withdrawal request', async () => {
    const completedOrder = {
      ...ORDER,
      contractConcludedAt: '2026-08-03T13:00:00.000Z',
      deliveredAt: '2026-08-05T18:30:00.000Z',
      deliveryMethod: 'shipping' as const,
      status: 'delivered' as const,
    }
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(completedOrder) })
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    const result = await service.getById(ORDER.id)

    expect(result).toMatchObject({
      contractConcludedAt: completedOrder.contractConcludedAt,
      deliveredAt: completedOrder.deliveredAt,
      pickedUpAt: null,
    })
  })

  it('confirms a transfer payment without changing the order status', async () => {
    const repository = createRepository({ transition: vi.fn().mockResolvedValue(true) })
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    await service.executeAction(ORDER.id, {
      action: 'confirmPayment',
      expectedUpdatedAt: ORDER.updatedAt,
    }, ACTOR_ID)

    expect(repository.transition).toHaveBeenCalledWith(
      ORDER.id,
      'pending',
      'paid',
      ACTOR_ID,
      ORDER.updatedAt,
    )
  })

  it('confirms cash payment independently from the order status', async () => {
    const readyCash = { ...ORDER, discount: 0, paymentMethod: 'cash' as const, status: 'ready' as const }
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(readyCash),
      transition: vi.fn().mockResolvedValue(true),
    })
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    await service.executeAction(ORDER.id, {
      action: 'confirmPayment',
      expectedUpdatedAt: ORDER.updatedAt,
    }, ACTOR_ID)

    expect(repository.transition).toHaveBeenCalledWith(
      ORDER.id,
      'ready',
      'paid',
      ACTOR_ID,
      ORDER.updatedAt,
    )
  })

  it('rejects actions unavailable for the current method and status', async () => {
    const repository = createRepository()
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    await expect(service.executeAction(ORDER.id, {
      action: 'markReady',
      expectedUpdatedAt: ORDER.updatedAt,
    }, ACTOR_ID)).rejects.toMatchObject({ code: 'ORDER_ACTION_NOT_ALLOWED', statusCode: 409 })
    expect(repository.transition).not.toHaveBeenCalled()
  })

  it('rejects stale administrative actions before invoking the RPC', async () => {
    const repository = createRepository()
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    await expect(service.executeAction(ORDER.id, {
      action: 'confirmPayment',
      expectedUpdatedAt: '2026-08-03T11:00:00.000Z',
    }, ACTOR_ID)).rejects.toMatchObject({ code: 'ORDER_UPDATE_CONFLICT', statusCode: 409 })
    expect(repository.transition).not.toHaveBeenCalled()
  })

  it('requires reinforced confirmation before cancelling a paid order', async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue({ ...ORDER, paymentStatus: 'paid', status: 'preparing' }),
    })
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    await expect(service.cancel(ORDER.id, {
      confirmManualRefund: false,
      expectedUpdatedAt: ORDER.updatedAt,
      reason: 'Solicitud del cliente',
    }, ACTOR_ID)).rejects.toMatchObject({
      code: 'ORDER_MANUAL_REFUND_CONFIRMATION_REQUIRED',
      statusCode: 409,
    })
    expect(repository.cancel).not.toHaveBeenCalled()
  })

  it('cancels through the atomic RPC and reports restored stock', async () => {
    const cancelled = { ...ORDER, status: 'cancelled' as const, updatedAt: '2026-08-03T13:00:00.000Z' }
    const repository = createRepository({
      cancel: vi.fn().mockResolvedValue(true),
      findById: vi.fn()
        .mockResolvedValueOnce(ORDER)
        .mockResolvedValueOnce(cancelled),
    })
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    const result = await service.cancel(ORDER.id, {
      confirmManualRefund: false,
      expectedUpdatedAt: ORDER.updatedAt,
      reason: 'Solicitud del cliente',
    }, ACTOR_ID)

    expect(repository.cancel).toHaveBeenCalledWith(
      ORDER.id,
      ACTOR_ID,
      'Solicitud del cliente',
      ORDER.updatedAt,
      false,
    )
    expect(result).toMatchObject({ order: { status: 'cancelled' }, stockRestored: true })
  })
})
