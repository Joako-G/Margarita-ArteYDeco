import assert from 'node:assert/strict'
import test from 'node:test'

import { getCartAvailabilityChangeMessage, reconcileCartItems } from './cart-availability.ts'

function createProduct(overrides = {}) {
  return {
    categoryId: 'category-id',
    createdAt: '2026-08-01T10:00:00.000Z',
    description: 'Descripción',
    id: 'product-id',
    image: null,
    isActive: true,
    isFeatured: false,
    name: 'Molde de rosas',
    price: 12500,
    slug: 'molde-de-rosas',
    stockQuantity: 8,
    updatedAt: '2026-08-02T10:00:00.000Z',
    ...overrides,
  }
}

function createCartItem(overrides = {}) {
  return {
    ...createProduct(),
    quantity: 2,
    ...overrides,
  }
}

test('actualiza los datos del producto sin informar cambios cuando la cantidad sigue vigente', () => {
  const result = reconcileCartItems(
    [createCartItem({ price: 10000 })],
    [createProduct({ price: 12500 })],
  )

  assert.equal(result.items[0].price, 12500)
  assert.equal(result.items[0].quantity, 2)
  assert.deepEqual(result.changes, [])
})

test('reduce la cantidad al stock actual y comunica el nuevo máximo', () => {
  const result = reconcileCartItems(
    [createCartItem({ quantity: 6 })],
    [createProduct({ stockQuantity: 3 })],
  )

  assert.equal(result.items[0].quantity, 3)
  assert.equal(result.changes[0].reason, 'stock_reduced')
  assert.equal(
    getCartAvailabilityChangeMessage(result.changes[0]),
    'La cantidad de Molde de rosas se ajustó a 3 unidades disponibles.',
  )
})

test('elimina y comunica por separado productos agotados y productos no disponibles', () => {
  const result = reconcileCartItems(
    [
      createCartItem({ id: 'out-of-stock', name: 'Pincel fino' }),
      createCartItem({ id: 'unavailable', name: 'Lámina floral' }),
    ],
    [createProduct({ id: 'out-of-stock', name: 'Pincel fino', stockQuantity: 0 })],
  )

  assert.deepEqual(result.items, [])
  assert.deepEqual(
    result.changes.map((change) => change.reason),
    ['out_of_stock', 'unavailable'],
  )
  assert.equal(
    getCartAvailabilityChangeMessage(result.changes[0]),
    'Pincel fino quedó sin stock y se quitó del carrito.',
  )
  assert.equal(
    getCartAvailabilityChangeMessage(result.changes[1]),
    'Lámina floral dejó de estar disponible y se quitó del carrito.',
  )
})

test('corrige cantidades persistidas que quedaron fuera del rango válido', () => {
  const result = reconcileCartItems([createCartItem({ quantity: 0 })], [createProduct()])

  assert.equal(result.items[0].quantity, 1)
  assert.equal(result.changes[0].reason, 'invalid_quantity')
})
