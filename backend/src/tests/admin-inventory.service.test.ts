import { describe, expect, it, vi } from 'vitest'

import {
  InventoryAdjustmentDatabaseError,
  type IAdminInventoryRepository,
} from '../repositories/admin-inventory.repository.js'
import { AdminInventoryService } from '../services/admin-inventory.service.js'

const PRODUCT_ID = '9b66d7f7-f41c-485f-8a65-a3ac1ef8f3ee'
const ACTOR_ID = 'bd62774b-7863-4fb4-a041-60d9003a4432'

function createRepository(
  overrides: Partial<IAdminInventoryRepository> = {},
): IAdminInventoryRepository {
  return {
    adjustStock: vi.fn(),
    findPage: vi.fn(),
    ...overrides,
  }
}

describe('AdminInventoryService', () => {
  it('maps a stable paginated history with the current product stock', async () => {
    const repository = createRepository({
      findPage: vi.fn().mockResolvedValue({
        items: [{
          actorName: 'Admin de Prueba',
          createdAt: '2026-08-03T12:00:00.000Z',
          id: '8e63a8ee-2266-488f-886b-bc50e499cd41',
          movementType: 'manual_adjustment',
          orderNumber: null,
          quantityDelta: 3,
          reason: 'Reposición de depósito',
          stockAfter: 7,
          stockBefore: 4,
        }],
        product: { id: PRODUCT_ID, name: 'Pincel redondo', stockQuantity: 7 },
        totalItems: 11,
      }),
    })
    const service = new AdminInventoryService(repository)

    await expect(service.getHistory(PRODUCT_ID, { page: 2, pageSize: 10 })).resolves.toEqual({
      movements: [expect.objectContaining({ quantityDelta: 3, stockAfter: 7 })],
      pagination: {
        hasNextPage: false,
        hasPreviousPage: true,
        page: 2,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
      },
      product: { id: PRODUCT_ID, name: 'Pincel redondo', stockQuantity: 7 },
    })
  })

  it('converts the selected direction into a signed atomic adjustment', async () => {
    const repository = createRepository({ adjustStock: vi.fn().mockResolvedValue(2) })
    const service = new AdminInventoryService(repository)

    await expect(service.adjustStock(PRODUCT_ID, {
      direction: 'decrease',
      quantity: 2,
      reason: 'Retiro por rotura',
    }, ACTOR_ID)).resolves.toEqual({ stockQuantity: 2 })

    expect(repository.adjustStock).toHaveBeenCalledWith(
      PRODUCT_ID,
      -2,
      'Retiro por rotura',
      ACTOR_ID,
    )
  })

  it('maps database invariants to safe domain errors', async () => {
    const repository = createRepository({
      adjustStock: vi.fn().mockRejectedValue(new InventoryAdjustmentDatabaseError('23514')),
    })

    await expect(new AdminInventoryService(repository).adjustStock(PRODUCT_ID, {
      direction: 'decrease',
      quantity: 10,
      reason: 'Corrección de conteo',
    }, ACTOR_ID)).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK_FOR_ADJUSTMENT',
      statusCode: 409,
    })
  })

  it('does not expose history for a missing or deleted product', async () => {
    const service = new AdminInventoryService(createRepository({
      findPage: vi.fn().mockResolvedValue(null),
    }))

    await expect(service.getHistory(PRODUCT_ID, { page: 1, pageSize: 10 }))
      .rejects.toMatchObject({ code: 'ADMIN_PRODUCT_NOT_FOUND', statusCode: 404 })
  })
})
