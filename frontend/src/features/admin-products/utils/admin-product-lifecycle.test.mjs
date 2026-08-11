import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAdminProductLifecycleErrorMessage,
  getAdminProductLifecycleSuccessMessage,
} from './admin-product-lifecycle.ts'

test('describes publication changes in plain language', () => {
  assert.equal(
    getAdminProductLifecycleSuccessMessage('Pincel redondo', 'publication', false),
    '“Pincel redondo” quedó oculto y ya no puede agregarse a nuevos pedidos.',
  )
})

test('explains the category rule when publication is rejected', () => {
  assert.equal(
    getAdminProductLifecycleErrorMessage('PRODUCT_CATEGORY_INACTIVE'),
    'Activá la categoría del producto antes de publicarlo.',
  )
})

test('does not expose an unknown backend error to the user', () => {
  assert.equal(
    getAdminProductLifecycleErrorMessage('UNKNOWN_ERROR'),
    'No pudimos guardar el cambio. Intentá nuevamente.',
  )
})
