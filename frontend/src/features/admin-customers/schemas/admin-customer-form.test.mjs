import assert from 'node:assert/strict'
import test from 'node:test'

import { adminCustomerFormSchema } from './admin-customer-form.schema.ts'

test('acepta datos de contacto válidos y observaciones opcionales', () => {
  const result = adminCustomerFormSchema.safeParse({
    firstName: 'Ana',
    lastName: 'Pérez',
    notes: '',
    phone: '+54 9 11 5555-1234',
  })

  assert.equal(result.success, true)
})

test('rechaza celulares que no pueden normalizarse al formato requerido', () => {
  const result = adminCustomerFormSchema.safeParse({
    firstName: 'Ana',
    lastName: 'Pérez',
    notes: '',
    phone: 'sin teléfono',
  })

  assert.equal(result.success, false)
})
