import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateCartTotals,
  getCartQuantity,
  getItemAvailabilityLabel,
} from './cart-calculations.ts'

const CART_ITEMS = [
  {
    id: 'product-1',
    name: 'Molde de rosas',
    price: 12500,
    quantity: 2,
    isActive: true,
    stockQuantity: 8,
  },
  {
    id: 'product-2',
    name: 'Pincel liner fino',
    price: 4200,
    quantity: 1,
    isActive: true,
    stockQuantity: 1,
  },
]

test('calcula subtotal, descuento y total del carrito', () => {
  assert.deepEqual(calculateCartTotals(CART_ITEMS), {
    subtotal: 29200,
    discount: 0,
    total: 29200,
  })
})

test('calcula la cantidad total de unidades', () => {
  assert.equal(getCartQuantity(CART_ITEMS), 3)
})

test('comunica correctamente la disponibilidad de un producto', () => {
  assert.equal(getItemAvailabilityLabel(CART_ITEMS[1]), '1 unidad disponible.')
  assert.equal(
    getItemAvailabilityLabel({ ...CART_ITEMS[1], isActive: false }),
    'Ya no está disponible.',
  )
})
