import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAdminCategoryLifecycleErrorMessage,
  getAdminCategoryLifecycleSuccessMessage,
} from './admin-category-lifecycle.ts'

test('explica por qué una categoría con productos no puede eliminarse', () => {
  assert.match(
    getAdminCategoryLifecycleErrorMessage('CATEGORY_HAS_PRODUCTS'),
    /Reasignalos/,
  )
})

test('explica la imagen requerida antes de publicar', () => {
  assert.equal(
    getAdminCategoryLifecycleErrorMessage('CATEGORY_IMAGE_REQUIRED_FOR_PUBLICATION'),
    'Cargá una imagen antes de activar la categoría.',
  )
})

test('describe las acciones de publicación sin exponer detalles internos', () => {
  assert.equal(
    getAdminCategoryLifecycleSuccessMessage('Pinceles', 'publication', false),
    'Desactivaste Pinceles.',
  )
  assert.equal(
    getAdminCategoryLifecycleSuccessMessage('Pinceles', 'delete'),
    'Eliminaste Pinceles del panel.',
  )
})
