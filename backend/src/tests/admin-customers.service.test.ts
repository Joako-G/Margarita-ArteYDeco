import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'

import type { IAdminCustomerRepository } from '../repositories/admin-customers.repository.js'
import { CustomerPhoneConflictError } from '../repositories/admin-customers.repository.js'
import { AdminCustomerService } from '../services/admin-customers.service.js'
import type { IAdminCustomerRecord } from '../types/admin-customers.js'

const CUSTOMER: IAdminCustomerRecord = {
  createdAt: '2026-08-01T12:00:00.000Z',
  firstName: 'Ana',
  id: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
  lastName: 'Pérez',
  notes: 'Prefiere contacto por la tarde',
  orderCount: 2,
  phone: '+54 9 11 5555-1234',
  phoneNormalized: '5491155551234',
  updatedAt: '2026-08-03T12:00:00.000Z',
}
const ACTOR_ID = 'bd62774b-7863-4fb4-a041-60d9003a4432'

function createRepository(overrides: Partial<IAdminCustomerRepository> = {}): IAdminCustomerRepository {
  return {
    findById: vi.fn().mockResolvedValue(CUSTOMER),
    findOrders: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
    findPage: vi.fn().mockResolvedValue({ items: [CUSTOMER], totalItems: 1 }),
    softDelete: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(CUSTOMER),
    ...overrides,
  }
}

const logger = pino({ enabled: false })

describe('AdminCustomerService', () => {
  it('returns a paginated list without exposing normalized phones', async () => {
    const service = new AdminCustomerService(createRepository(), logger)
    const result = await service.list({ page: 1, pageSize: 10, sort: 'nameAsc' })

    expect(result.pagination).toMatchObject({ totalItems: 1, totalPages: 1 })
    expect(result.items[0]).toMatchObject({ firstName: 'Ana', orderCount: 2 })
    expect(JSON.stringify(result)).not.toContain('phoneNormalized')
  })

  it('returns paginated immutable order history', async () => {
    const repository = createRepository({
      findOrders: vi.fn().mockResolvedValue({
        items: [{
          createdAt: CUSTOMER.createdAt,
          id: '641bffeb-d7d3-43d4-aa5b-e5f6f5940e8d',
          orderNumber: 'MAD-20260801-000001',
          paymentMethod: 'cash',
          paymentStatus: 'paid',
          status: 'picked_up',
          total: 15000,
        }],
        totalItems: 11,
      }),
    })
    const service = new AdminCustomerService(repository, logger)

    const result = await service.getById(CUSTOMER.id, { page: 2, pageSize: 10 })

    expect(repository.findOrders).toHaveBeenCalledWith(CUSTOMER.id, 2, 10)
    expect(result.orders.pagination).toMatchObject({ page: 2, totalItems: 11, totalPages: 2 })
  })

  it('normalizes a changed phone and does not mutate order snapshots', async () => {
    const repository = createRepository()
    const service = new AdminCustomerService(repository, logger)

    await service.update(CUSTOMER.id, {
      expectedUpdatedAt: CUSTOMER.updatedAt,
      firstName: 'Ana María',
      lastName: 'Pérez',
      notes: null,
      phone: '+54 9 11 4444-0000',
    }, ACTOR_ID)

    expect(repository.update).toHaveBeenCalledWith(CUSTOMER.id, expect.objectContaining({
      phoneNormalized: '5491144440000',
    }))
  })

  it('rejects an invalid normalized phone', async () => {
    const repository = createRepository()
    const service = new AdminCustomerService(repository, logger)

    await expect(service.update(CUSTOMER.id, {
      expectedUpdatedAt: CUSTOMER.updatedAt,
      firstName: 'Ana',
      lastName: 'Pérez',
      notes: null,
      phone: '123',
    }, ACTOR_ID)).rejects.toMatchObject({ code: 'CUSTOMER_PHONE_INVALID', statusCode: 400 })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('maps duplicate phones to a safe conflict', async () => {
    const repository = createRepository({ update: vi.fn().mockRejectedValue(new CustomerPhoneConflictError()) })
    const service = new AdminCustomerService(repository, logger)

    await expect(service.update(CUSTOMER.id, {
      expectedUpdatedAt: CUSTOMER.updatedAt,
      firstName: 'Ana',
      lastName: 'Pérez',
      notes: null,
      phone: '+54 9 11 5555-1234',
    }, ACTOR_ID)).rejects.toMatchObject({ code: 'CUSTOMER_PHONE_CONFLICT', statusCode: 409 })
  })

  it('rejects stale updates before persistence', async () => {
    const repository = createRepository()
    const service = new AdminCustomerService(repository, logger)

    await expect(service.update(CUSTOMER.id, {
      expectedUpdatedAt: '2026-08-03T11:00:00.000Z',
      firstName: 'Ana',
      lastName: 'Pérez',
      notes: null,
      phone: CUSTOMER.phone,
    }, ACTOR_ID)).rejects.toMatchObject({ code: 'CUSTOMER_UPDATE_CONFLICT', statusCode: 409 })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('performs only a soft delete while preserving order history', async () => {
    const repository = createRepository()
    const service = new AdminCustomerService(repository, logger)

    await service.softDelete(CUSTOMER.id, CUSTOMER.updatedAt, ACTOR_ID)

    expect(repository.softDelete).toHaveBeenCalledWith(CUSTOMER.id, CUSTOMER.updatedAt)
  })
})
