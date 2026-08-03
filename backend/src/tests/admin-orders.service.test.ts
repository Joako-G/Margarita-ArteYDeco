import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { IAdminOrderRepository } from '../repositories/admin-orders.repository.js'
import type { ISettingsRepository } from '../repositories/settings.repository.js'
import { AdminOrderService } from '../services/admin-orders.service.js'
import type { IAdminOrderRecord } from '../types/admin-orders.js'

const ORDER: IAdminOrderRecord = {
  createdAt: '2026-08-03T12:00:00.000Z',
  customerFirstName: 'Ana',
  customerLastName: 'Pérez',
  customerPhone: '+54 9 11 5555-1234',
  customerPhoneNormalized: '5491155551234',
  discount: 1200,
  id: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
  itemCount: 2,
  notes: 'Retira por la tarde',
  orderNumber: 'MAD-20260803-000001',
  paymentMethod: 'bank_transfer',
  paymentStatus: 'pending',
  pickedUpAt: null,
  status: 'payment_pending',
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
      { productName: 'Pinceles', quantity: 2, subtotal: 10800, unitPrice: 5400 },
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

  it('confirms a transfer payment with the required paired statuses', async () => {
    const repository = createRepository({ transition: vi.fn().mockResolvedValue(true) })
    const service = new AdminOrderService(repository, createSettingsRepository(), logger)

    await service.executeAction(ORDER.id, {
      action: 'confirmPayment',
      expectedUpdatedAt: ORDER.updatedAt,
    }, ACTOR_ID)

    expect(repository.transition).toHaveBeenCalledWith(
      ORDER.id,
      'paid',
      'paid',
      ACTOR_ID,
      ORDER.updatedAt,
    )
  })

  it('confirms cash only after the order is ready', async () => {
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
      'paid',
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
