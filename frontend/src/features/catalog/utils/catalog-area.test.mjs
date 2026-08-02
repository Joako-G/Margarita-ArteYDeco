import assert from 'node:assert/strict'
import test from 'node:test'

import { filterCategoriesByArea, getCatalogAreaQuery, parseCatalogArea } from './catalog-area.ts'

const categories = [
  { catalogArea: 'art', id: 'art-1' },
  { catalogArea: 'decoration', id: 'decoration-1' },
  { catalogArea: 'art', id: 'art-2' },
]

test('convierte los valores públicos de la URL al área interna', () => {
  assert.equal(parseCatalogArea('arte'), 'art')
  assert.equal(parseCatalogArea('decoraciones'), 'decoration')
  assert.equal(parseCatalogArea('otro'), null)
  assert.equal(parseCatalogArea(null), null)
})

test('genera el valor público de URL correspondiente a cada área', () => {
  assert.equal(getCatalogAreaQuery('art'), 'arte')
  assert.equal(getCatalogAreaQuery('decoration'), 'decoraciones')
})

test('filtra categorías sin mezclar Arte y Decoraciones', () => {
  assert.deepEqual(
    filterCategoriesByArea(categories, 'art').map((category) => category.id),
    ['art-1', 'art-2'],
  )
  assert.deepEqual(
    filterCategoriesByArea(categories, 'decoration').map((category) => category.id),
    ['decoration-1'],
  )
  assert.equal(filterCategoriesByArea(categories, 'all').length, 3)
})
