import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAdminOrderSearchParams,
  parseAdminOrderFilters,
} from './admin-order-filters.ts'

test('usa filtros seguros frente a parámetros ausentes o inválidos', () => {
  const result = parseAdminOrderFilters(new URLSearchParams(
    'page=0&pageSize=100&paymentMethod=card&paymentStatus=other&sort=unknown&status=new',
  ))

  assert.deepEqual(result, {
    page: 1,
    pageSize: 10,
    paymentMethod: 'all',
    paymentStatus: 'all',
    sort: 'newest',
    status: 'all',
  })
})

test('normaliza filtros válidos de operación y pago', () => {
  const result = parseAdminOrderFilters(new URLSearchParams(
    'page=2&pageSize=20&paymentMethod=bank_transfer&paymentStatus=pending&search= MAD-123 &sort=oldest&status=payment_pending',
  ))

  assert.deepEqual(result, {
    page: 2,
    pageSize: 20,
    paymentMethod: 'bank_transfer',
    paymentStatus: 'pending',
    search: 'MAD-123',
    sort: 'oldest',
    status: 'payment_pending',
  })
})

test('mantiene una URL breve y recuperable', () => {
  const params = buildAdminOrderSearchParams({
    page: 1,
    pageSize: 10,
    paymentMethod: 'cash',
    paymentStatus: 'all',
    sort: 'newest',
    status: 'ready',
  })

  assert.equal(params.toString(), 'paymentMethod=cash&status=ready')
  assert.deepEqual(parseAdminOrderFilters(params), {
    page: 1,
    pageSize: 10,
    paymentMethod: 'cash',
    paymentStatus: 'all',
    sort: 'newest',
    status: 'ready',
  })
})
