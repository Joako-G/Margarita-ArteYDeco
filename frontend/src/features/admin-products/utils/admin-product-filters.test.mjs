import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAdminProductSearchParams,
  DEFAULT_ADMIN_PRODUCT_FILTERS,
  parseAdminProductFilters,
} from './admin-product-filters.ts'

test('usa filtros seguros frente a parámetros ausentes o inválidos', () => {
  assert.deepEqual(parseAdminProductFilters(new URLSearchParams()), DEFAULT_ADMIN_PRODUCT_FILTERS)
  assert.deepEqual(
    parseAdminProductFilters(
      new URLSearchParams(
        'page=-2&pageSize=500&publication=draft&search=a&sort=random&stock=negative',
      ),
    ),
    DEFAULT_ADMIN_PRODUCT_FILTERS,
  )
})

test('normaliza filtros válidos y limita la página máxima', () => {
  assert.deepEqual(
    parseAdminProductFilters(
      new URLSearchParams(
        'page=12000&pageSize=20&publication=inactive&search=%20Rosas%20&sort=priceDesc&stock=lowStock',
      ),
    ),
    {
      page: 10_000,
      pageSize: 20,
      publication: 'inactive',
      search: 'Rosas',
      sort: 'priceDesc',
      stock: 'lowStock',
    },
  )
})

test('mantiene la URL breve y permite recuperar los filtros aplicados', () => {
  const filters = {
    page: 3,
    pageSize: 50,
    publication: 'active',
    search: 'Molde rosas',
    sort: 'nameAsc',
    stock: 'inStock',
  }
  const searchParams = buildAdminProductSearchParams(filters)

  assert.equal(searchParams.get('search'), 'Molde rosas')
  assert.deepEqual(parseAdminProductFilters(searchParams), filters)
  assert.equal(buildAdminProductSearchParams(DEFAULT_ADMIN_PRODUCT_FILTERS).toString(), '')
})
