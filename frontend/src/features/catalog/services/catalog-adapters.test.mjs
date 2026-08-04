import assert from 'node:assert/strict'
import test from 'node:test'

import { adaptPublicCategory, adaptPublicProduct } from './catalog-adapters.ts'

test('adapts public categories to active frontend categories', () => {
  const category = adaptPublicCategory({
    catalogArea: 'art',
    description: 'Materiales para crear',
    displayOrder: 2,
    id: 'category-id',
    imageUrl: null,
    name: 'Pinceles',
    slug: 'pinceles',
  })

  assert.deepEqual(category, {
    catalogArea: 'art',
    description: 'Materiales para crear',
    displayOrder: 2,
    id: 'category-id',
    image: null,
    isActive: true,
    name: 'Pinceles',
    slug: 'pinceles',
  })
})

test('preserves public product stock and nullable images', () => {
  const product = adaptPublicProduct({
    categoryId: 'category-id',
    createdAt: '2026-08-01T10:00:00.000Z',
    description: 'Pincel para detalles',
    id: 'product-id',
    imageUrl: null,
    isFeatured: true,
    name: 'Pincel fino',
    price: 4200,
    slug: 'pincel-fino',
    stockQuantity: 0,
    updatedAt: '2026-08-02T10:00:00.000Z',
  })

  assert.equal(product.image, null)
  assert.equal(product.isActive, true)
  assert.equal(product.stockQuantity, 0)
})
