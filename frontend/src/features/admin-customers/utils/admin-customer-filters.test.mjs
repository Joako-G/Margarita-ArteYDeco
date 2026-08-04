import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAdminCustomerSearchParams,
  parseAdminCustomerFilters,
} from './admin-customer-filters.ts'

test('usa filtros seguros frente a parámetros ausentes o inválidos', () => {
  const result = parseAdminCustomerFilters(new URLSearchParams(
    'page=0&pageSize=100&sort=unknown&search=x',
  ))

  assert.deepEqual(result, { page: 1, pageSize: 10, sort: 'nameAsc' })
})

test('normaliza búsqueda, orden y paginación válidos', () => {
  const result = parseAdminCustomerFilters(new URLSearchParams(
    'page=2&pageSize=20&sort=newest&search= Ana Pérez ',
  ))

  assert.deepEqual(result, {
    page: 2,
    pageSize: 20,
    search: 'Ana Pérez',
    sort: 'newest',
  })
})

test('mantiene una URL breve y recuperable', () => {
  const params = buildAdminCustomerSearchParams({
    page: 1,
    pageSize: 10,
    search: '54911',
    sort: 'nameAsc',
  })

  assert.equal(params.toString(), 'search=54911')
  assert.deepEqual(parseAdminCustomerFilters(params), {
    page: 1,
    pageSize: 10,
    search: '54911',
    sort: 'nameAsc',
  })
})
