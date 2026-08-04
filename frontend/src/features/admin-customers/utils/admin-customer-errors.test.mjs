import assert from 'node:assert/strict'
import test from 'node:test'

import { getAdminCustomerErrorMessage } from './admin-customer-errors.ts'

test('traduce conflictos y validaciones de celular de clientes', () => {
  assert.equal(
    getAdminCustomerErrorMessage('CUSTOMER_PHONE_CONFLICT'),
    'Ya existe otro cliente con ese celular.',
  )
  assert.equal(
    getAdminCustomerErrorMessage('CUSTOMER_PHONE_INVALID'),
    'Revisá el celular e incluí el código de área.',
  )
})

test('avisa sobre ediciones concurrentes en clientes', () => {
  assert.match(getAdminCustomerErrorMessage('CUSTOMER_UPDATE_CONFLICT'), /Recargá la página/)
})

test('entrega un mensaje de guardado genérico por defecto', () => {
  assert.equal(
    getAdminCustomerErrorMessage('WHATEVER'),
    'No pudimos guardar los cambios. Intentá nuevamente.',
  )
  assert.equal(
    getAdminCustomerErrorMessage(null),
    'No pudimos guardar los cambios. Intentá nuevamente.',
  )
})
