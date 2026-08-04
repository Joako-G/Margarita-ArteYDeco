import assert from 'node:assert/strict'
import test from 'node:test'

import { ORDER_STATUS_DETAILS } from '../../../shared/utils/order-status.ts'
import {
  formatDashboardDate,
  getPaymentMethodLabel,
} from './admin-dashboard-formatters.ts'

test('traduce los métodos y estados operativos del Dashboard', () => {
  assert.equal(getPaymentMethodLabel('cash'), 'Efectivo')
  assert.equal(getPaymentMethodLabel('bank_transfer'), 'Transferencia')
  assert.equal(ORDER_STATUS_DETAILS.payment_pending.label, 'Pendiente de pago')
  assert.equal(ORDER_STATUS_DETAILS.picked_up.label, 'Retirado')
})

test('presenta la fecha reciente en el locale administrativo', () => {
  const formatted = formatDashboardDate('2026-08-02T15:30:00.000Z')

  assert.match(formatted, /2026/)
  assert.match(formatted, /ago/)
})
