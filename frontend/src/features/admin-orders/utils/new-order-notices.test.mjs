import assert from 'node:assert/strict'
import test from 'node:test'

import {
  detectNewOrders,
  mergeNewOrderNotices,
  NEW_ORDER_NOTICE_LIMIT,
  removeNotice,
  toNewOrderNotice,
} from './new-order-notices.ts'

function buildOrder(id, createdAt) {
  return {
    createdAt,
    customer: { firstName: 'Ana', lastName: 'Pérez', phone: '3415550000' },
    id,
    orderNumber: `MAD-${id}`,
    paymentMethod: 'bank_transfer',
    total: 12000,
  }
}

test('detecta solo los pedidos que todavía no fueron vistos', () => {
  const orders = [buildOrder('3', '2026-11-11T12:00:00Z'), buildOrder('2', '2026-11-11T11:00:00Z')]

  assert.deepEqual(
    detectNewOrders(['2'], orders).map((order) => order.id),
    ['3'],
  )
  assert.deepEqual(detectNewOrders(['2', '3'], orders), [])
  assert.deepEqual(
    detectNewOrders([], orders).map((order) => order.id),
    ['3', '2'],
  )
})

test('el aviso no arrastra datos personales del cliente', () => {
  const notice = toNewOrderNotice(buildOrder('1', '2026-11-11T12:00:00Z'))

  assert.deepEqual(Object.keys(notice).sort(), [
    'createdAt',
    'id',
    'orderNumber',
    'paymentMethod',
    'total',
  ])
})

test('acumula avisos sin repetir y deja primero el pedido más reciente', () => {
  const older = toNewOrderNotice(buildOrder('1', '2026-11-11T10:00:00Z'))
  const newer = toNewOrderNotice(buildOrder('2', '2026-11-11T12:00:00Z'))

  assert.deepEqual(
    mergeNewOrderNotices([older], [newer, older]).map((notice) => notice.id),
    ['2', '1'],
  )
})

test('conserva únicamente los últimos avisos', () => {
  const notices = Array.from({ length: NEW_ORDER_NOTICE_LIMIT + 5 }, (_, index) =>
    toNewOrderNotice(buildOrder(`${index}`, `2026-11-11T${String(index).padStart(2, '0')}:00:00Z`)),
  )

  const merged = mergeNewOrderNotices([], notices)

  assert.equal(merged.length, NEW_ORDER_NOTICE_LIMIT)
  assert.equal(merged[0].id, `${NEW_ORDER_NOTICE_LIMIT + 4}`)
})

test('al abrir un aviso se descarta solo ese', () => {
  const notices = [
    toNewOrderNotice(buildOrder('1', '2026-11-11T10:00:00Z')),
    toNewOrderNotice(buildOrder('2', '2026-11-11T12:00:00Z')),
  ]

  assert.deepEqual(
    removeNotice(notices, '2').map((notice) => notice.id),
    ['1'],
  )
  assert.deepEqual(
    removeNotice(notices, 'inexistente').map((notice) => notice.id),
    ['1', '2'],
  )
})
