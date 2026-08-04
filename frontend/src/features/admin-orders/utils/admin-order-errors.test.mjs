import assert from 'node:assert/strict'
import test from 'node:test'

import { getAdminOrderErrorMessage } from './admin-order-errors.ts'

test('avisa cuando el pedido cambió mientras se revisaba', () => {
  assert.match(getAdminOrderErrorMessage('ORDER_UPDATE_CONFLICT'), /Recargamos el detalle/)
  assert.match(getAdminOrderErrorMessage('ORDER_TRANSITION_CONFLICT'), /Recargamos el detalle/)
})

test('explica acciones ya no disponibles según el estado', () => {
  assert.equal(
    getAdminOrderErrorMessage('ORDER_ACTION_NOT_ALLOWED'),
    'Esta acción ya no está disponible para el estado actual del pedido.',
  )
})

test('distingue cancelaciones imposibles de reintegros manuales', () => {
  assert.match(
    getAdminOrderErrorMessage('ORDER_CANCELLATION_NOT_ALLOWED'),
    /ya no puede cancelarse/,
  )
  assert.match(getAdminOrderErrorMessage('ORDER_ALREADY_CANCELLED'), /ya no puede cancelarse/)
  assert.match(
    getAdminOrderErrorMessage('ORDER_MANUAL_REFUND_CONFIRMATION_REQUIRED'),
    /Confirmá que gestionarás el reintegro/,
  )
})

test('entrega un mensaje de actualización genérico por defecto', () => {
  assert.equal(
    getAdminOrderErrorMessage(null),
    'No pudimos actualizar el pedido. Intentá nuevamente.',
  )
})
