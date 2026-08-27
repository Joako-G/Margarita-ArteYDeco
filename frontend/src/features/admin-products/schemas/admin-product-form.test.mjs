import assert from 'node:assert/strict'
import test from 'node:test'

import { adminProductFormSchema } from './admin-product-form.schema.ts'

function createProduct(overrides = {}) {
  return {
    categoryId: '3a2b9148-7dbf-4b88-a47f-296205f5e4de',
    description: '',
    discountPercentage: '20',
    image: undefined,
    isActive: true,
    isFeatured: false,
    name: 'Molde de rosas',
    price: '12500',
    removeCurrentImage: false,
    stockQuantity: '8',
    ...overrides,
  }
}

test('acepta porcentajes con hasta dos decimales', () => {
  assert.equal(adminProductFormSchema.safeParse(createProduct()).success, true)
  assert.equal(
    adminProductFormSchema.safeParse(createProduct({ discountPercentage: '12,50' })).success,
    true,
  )
})

test('rechaza descuentos fuera de rango o que dejan el precio en cero', () => {
  assert.equal(
    adminProductFormSchema.safeParse(createProduct({ discountPercentage: '100' })).success,
    false,
  )
  assert.equal(
    adminProductFormSchema.safeParse(createProduct({
      discountPercentage: '99.99',
      price: '0.01',
    })).success,
    false,
  )
})
