import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAdminCategorySearchParams,
  parseAdminCategoryFilters,
} from './admin-category-filters.ts'

test('usa filtros seguros frente a parámetros ausentes o inválidos', () => {
  const result = parseAdminCategoryFilters(new URLSearchParams(
    'area=invalid&page=0&pageSize=100&publication=other&sort=unknown',
  ))

  assert.deepEqual(result, {
    area: 'all',
    page: 1,
    pageSize: 10,
    publication: 'all',
    sort: 'orderAsc',
  })
})

test('normaliza filtros válidos y conserva el área del catálogo', () => {
  const result = parseAdminCategoryFilters(new URLSearchParams(
    'area=decoration&page=2&pageSize=20&publication=inactive&search= cajas &sort=nameDesc',
  ))

  assert.deepEqual(result, {
    area: 'decoration',
    page: 2,
    pageSize: 20,
    publication: 'inactive',
    search: 'cajas',
    sort: 'nameDesc',
  })
})

test('mantiene la URL breve y recuperable', () => {
  const params = buildAdminCategorySearchParams({
    area: 'art',
    page: 1,
    pageSize: 10,
    publication: 'all',
    search: 'pinceles',
    sort: 'orderAsc',
  })

  assert.equal(params.toString(), 'area=art&search=pinceles')
  assert.deepEqual(parseAdminCategoryFilters(params), {
    area: 'art',
    page: 1,
    pageSize: 10,
    publication: 'all',
    search: 'pinceles',
    sort: 'orderAsc',
  })
})
