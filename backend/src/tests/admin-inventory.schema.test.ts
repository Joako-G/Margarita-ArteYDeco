import { describe, expect, it } from 'vitest'

import { adminInventoryMovementRowsSchema } from '../schemas/admin-inventory.schema.js'

describe('adminInventoryMovementRowsSchema', () => {
  it('accepts stock returned by an inspected consumer withdrawal', () => {
    const result = adminInventoryMovementRowsSchema.safeParse([{
      actor: { full_name: 'Administración' },
      created_at: '2026-08-21T22:54:00.000Z',
      id: '8e63a8ee-2266-488f-886b-bc50e499cd41',
      movement_type: 'consumer_withdrawal_return',
      order: { order_number: 'MAD-20260821-000007' },
      quantity_delta: 4,
      reason: 'Reposición compensatoria de una devolución',
      stock_after: 8,
      stock_before: 4,
    }])

    expect(result.success).toBe(true)
  })
})
