import assert from 'node:assert/strict'
import test from 'node:test'

import { checkoutSchema } from '../schemas/checkout.schema.ts'
import { calculateCheckoutTotals } from './checkout-calculations.ts'
import { getCheckoutApiErrorCode, getCheckoutErrorFeedback } from './checkout-errors.ts'
import { normalizePhone } from './checkout-links.ts'

function createApiError(error) {
  return {
    isAxiosError: true,
    response: {
      data: { error },
    },
  }
}

test('valida y normaliza los datos obligatorios del checkout', () => {
  const result = checkoutSchema.safeParse({
    firstName: '  Ana ',
    lastName: ' Pérez ',
    notes: '  Preparar para regalo. ',
    paymentMethod: 'transfer',
    phone: '5491123456789',
  })

  assert.equal(result.success, true)

  if (result.success) {
    assert.equal(result.data.firstName, 'Ana')
    assert.equal(result.data.notes, 'Preparar para regalo.')
  }

  assert.equal(
    checkoutSchema.safeParse({
      firstName: '',
      lastName: '',
      notes: '',
      paymentMethod: 'cash',
      phone: '123',
    }).success,
    false,
  )

  assert.equal(
    checkoutSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Pérez',
      notes: '',
      paymentMethod: 'cash',
      phone: '11abc23456789',
    }).success,
    false,
  )
})

test('calcula el descuento por transferencia desde la configuración', () => {
  assert.deepEqual(
    calculateCheckoutTotals(
      [
        { price: 12500, quantity: 2 },
        { price: 4200, quantity: 1 },
      ],
      'transfer',
      10,
    ),
    {
      subtotal: 29200,
      discount: 2920,
      discountPercentage: 10,
      total: 26280,
    },
  )
})

test('normaliza el celular sin persistir datos adicionales', () => {
  assert.equal(normalizePhone('+54 9 11 2345-6789'), '5491123456789')
})

test('diferencia stock, validación, CSRF y fallos temporales', () => {
  assert.equal(getCheckoutErrorFeedback(createApiError('PRODUCT_UNAVAILABLE')).kind, 'stock')
  assert.equal(getCheckoutErrorFeedback(createApiError('VALIDATION_ERROR')).kind, 'validation')
  assert.equal(getCheckoutErrorFeedback(createApiError('INVALID_CSRF_TOKEN')).kind, 'csrf')
  assert.equal(getCheckoutErrorFeedback(new Error('network')).kind, 'temporary')
  assert.equal(getCheckoutApiErrorCode(new Error('network')), null)
})

test('bloquea el reenvío si el pedido pudo crearse sin confirmación', () => {
  const feedback = getCheckoutErrorFeedback(createApiError('ORDER_CONFIRMATION_UNAVAILABLE'))

  assert.equal(feedback.kind, 'uncertain')
  assert.equal(feedback.blocksResubmission, true)
})
