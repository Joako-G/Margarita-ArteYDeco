import { describe, expect, it, vi } from 'vitest'

import { createLogger } from '../config/logger.js'
import type { IOrderRepository } from '../repositories/orders.repository.js'
import type { IGuestSessionService } from '../services/guest-sessions.service.js'
import type { IOrderConfirmationService } from '../services/order-confirmation.service.js'
import {
  OrderConfirmationUnavailableError,
  OrderService,
} from '../services/orders.service.js'
import { TEST_ENV } from './test-helpers.js'

const SESSION = {
  expiresAt: new Date('2026-09-01T15:00:00.000Z'),
  id: '4bed49f2-d735-4f1e-ac56-85bdf5996f7b',
  tokenToSet: 'A'.repeat(43),
}

const REQUEST = {
  customer: {
    firstName: 'Ana',
    lastName: 'Pérez',
    notes: '',
    phone: '+54 9 11 2345-6789',
  },
  items: [{ productId: 'ad0047db-6715-4cc0-a559-6a72649063bb', quantity: 2 }],
  paymentMethod: 'transfer' as const,
}

function createGuestSessionService(): IGuestSessionService {
  return {
    getOrCreate: vi.fn().mockResolvedValue(SESSION),
    resolve: vi.fn().mockResolvedValue(null),
    revokeByToken: vi.fn().mockResolvedValue(false),
    revokeCreatedSession: vi.fn().mockResolvedValue(undefined),
    rotateForRecovery: vi.fn().mockResolvedValue(SESSION),
  }
}

function createRepository(): IOrderRepository {
  return {
    createWithStock: vi.fn().mockResolvedValue({
      orderId: '967b46f5-97ea-4996-8a5e-0be8c2d55c09',
      orderNumber: 'MAD-20260802-000001',
    }),
    findConfirmation: vi.fn().mockResolvedValue({
      createdAt: '2026-08-02T15:00:00.000Z',
      customerFirstName: 'Ana',
      customerLastName: 'Pérez',
      discount: 120,
      items: [{ productName: 'Caja', quantity: 2, subtotal: 1200, unitPrice: 600 }],
      orderNumber: 'MAD-20260802-000001',
      paymentMethod: 'bank_transfer',
      status: 'payment_pending',
      subtotal: 1200,
      total: 1080,
    }),
    findOrderSettings: vi.fn().mockResolvedValue({
      address: 'Calle 123',
      bankName: 'Banco',
      businessHours: 'Lunes a viernes',
      mapsUrl: 'https://maps.google.com/example',
      transferAlias: 'margarita.alias',
      transferCbu: '0000000000000000000000',
      transferDiscount: 10,
      whatsapp: '5491100000000',
    }),
    findOrderIdByNumber: vi.fn().mockResolvedValue(null),
    findRecentOrderId: vi.fn().mockResolvedValue(null),
    findRecoveryCandidate: vi.fn().mockResolvedValue(null),
  }
}

function createConfirmationService(repository: IOrderRepository): IOrderConfirmationService {
  return {
    get: vi.fn().mockImplementation(async (orderId: string, sessionId: string) => {
      const [order, settings] = await Promise.all([
        repository.findConfirmation(orderId, sessionId),
        repository.findOrderSettings(),
      ])

      if (order === null || settings === null) {
        return null
      }

      return {
        bankDetails: {
          alias: settings.transferAlias,
          bankName: settings.bankName,
          cbu: settings.transferCbu,
        },
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          lineTotal: item.subtotal,
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        orderNumber: order.orderNumber,
        paymentMethod: 'transfer',
        pickup: {
          address: settings.address,
          businessHours: settings.businessHours,
          mapsUrl: settings.mapsUrl,
        },
        status: order.status,
        totals: {
          discount: order.discount,
          discountPercentage: settings.transferDiscount,
          subtotal: order.subtotal,
          total: order.total,
        },
        whatsappProofUrl: 'https://wa.me/example',
      }
    }),
  }
}

describe('OrderService', () => {
  it('normalizes the phone, maps transfer and returns the minimum public DTO', async () => {
    const repository = createRepository()
    const sessionService = createGuestSessionService()
    const service = new OrderService(
      repository,
      sessionService,
      createConfirmationService(repository),
      createLogger(TEST_ENV),
    )

    const result = await service.create(REQUEST, null, 'checkout-attempt-0001')

    expect(repository.createWithStock).toHaveBeenCalledWith(SESSION.id, expect.objectContaining({
      customer: expect.objectContaining({ phoneNormalized: '5491123456789' }),
      paymentMethod: 'bank_transfer',
    }))
    expect(result.confirmation.bankDetails).toEqual({
      alias: 'margarita.alias',
      bankName: 'Banco',
      cbu: '0000000000000000000000',
    })
    expect(result.confirmation).not.toHaveProperty('customer')
  })

  it('revokes a newly created session when the atomic RPC fails', async () => {
    const repository = createRepository()
    vi.mocked(repository.createWithStock).mockRejectedValue(new Error('RPC failed'))
    const sessionService = createGuestSessionService()
    const service = new OrderService(
      repository,
      sessionService,
      createConfirmationService(repository),
      createLogger(TEST_ENV),
    )

    await expect(service.create(REQUEST, null, 'checkout-attempt-0001')).rejects.toThrow('RPC failed')
    expect(sessionService.revokeCreatedSession).toHaveBeenCalledWith(SESSION)
  })

  it('preserves the session when only the post-commit confirmation lookup fails', async () => {
    const repository = createRepository()
    const confirmationService: IOrderConfirmationService = {
      get: vi.fn().mockRejectedValue(new Error('Read failed')),
    }
    const sessionService = createGuestSessionService()
    const service = new OrderService(
      repository,
      sessionService,
      confirmationService,
      createLogger(TEST_ENV),
    )

    const error = await service
      .create(REQUEST, null, 'checkout-attempt-0001')
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(OrderConfirmationUnavailableError)
    expect((error as OrderConfirmationUnavailableError).session).toEqual(SESSION)
    expect(sessionService.revokeCreatedSession).not.toHaveBeenCalled()
  })
})
