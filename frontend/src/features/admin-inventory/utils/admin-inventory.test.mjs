import assert from 'node:assert/strict'
import test from 'node:test'

import { adminStockAdjustmentSchema } from '../schemas/admin-stock-adjustment.schema.ts'
import {
  formatQuantityDelta,
  getInventoryMovementLabel,
} from './admin-inventory-formatters.ts'

test('formats movement labels and signed quantities for the history', () => {
  assert.equal(getInventoryMovementLabel('order_created'), 'Venta')
  assert.equal(getInventoryMovementLabel('order_cancelled'), 'Reposición por cancelación')
  assert.equal(formatQuantityDelta(4), '+4')
  assert.equal(formatQuantityDelta(-2), '-2')
})

test('accepts a valid adjustment and trims its reason', () => {
  assert.deepEqual(adminStockAdjustmentSchema.parse({
    direction: 'increase',
    quantity: 3,
    reason: '  Reposición de depósito  ',
  }), {
    direction: 'increase',
    quantity: 3,
    reason: 'Reposición de depósito',
  })
})

test('rejects zero quantities and reasons without useful context', () => {
  assert.equal(adminStockAdjustmentSchema.safeParse({
    direction: 'decrease',
    quantity: 0,
    reason: 'x',
  }).success, false)
})
