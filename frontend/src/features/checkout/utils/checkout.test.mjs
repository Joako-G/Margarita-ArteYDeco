import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { checkoutSchema } from '../schemas/checkout.schema.ts'
import { calculateCheckoutTotals } from './checkout-calculations.ts'
import { getCheckoutApiErrorCode, getCheckoutErrorFeedback } from './checkout-errors.ts'
import { getOrCreateCheckoutAttemptKey } from './checkout-idempotency.ts'
import { normalizePhone } from './checkout-links.ts'

const checkoutDirectory = dirname(fileURLToPath(import.meta.url))

async function readCheckoutFile(relativePath) {
  return readFile(resolve(checkoutDirectory, '..', relativePath), 'utf8')
}

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
    acceptTerms: true,
    deliveryMethod: 'pickup',
    firstName: '  Ana ',
    lastName: ' Pérez ',
    notes: '  Preparar para regalo. ',
    paymentMethod: 'transfer',
    phone: '5491123456789',
    shippingAddress: '',
  })

  assert.equal(result.success, true)

  if (result.success) {
    assert.equal(result.data.firstName, 'Ana')
    assert.equal(result.data.notes, 'Preparar para regalo.')
  }

  assert.equal(checkoutSchema.safeParse({
    acceptTerms: true,
    deliveryMethod: 'shipping',
    firstName: 'Ana',
    lastName: 'Pérez',
    notes: '',
    paymentMethod: 'transfer',
    phone: '5491123456789',
    shippingAddress: 'Belgrano 607, Jujuy',
  }).success, true)

  assert.equal(checkoutSchema.safeParse({
    acceptTerms: true,
    deliveryMethod: 'shipping',
    firstName: 'Ana',
    lastName: 'Pérez',
    notes: '',
    paymentMethod: 'cash',
    phone: '5491123456789',
    shippingAddress: 'Belgrano 607, Jujuy',
  }).success, false)

  assert.equal(checkoutSchema.safeParse({
    acceptTerms: true,
    deliveryMethod: 'shipping',
    firstName: 'Ana',
    lastName: 'Pérez',
    notes: '',
    paymentMethod: 'cash',
    phone: '5491123456789',
    shippingAddress: '',
  }).success, false)

  const withoutAcceptance = checkoutSchema.safeParse({
    acceptTerms: false,
    deliveryMethod: 'pickup',
    firstName: 'Ana',
    lastName: 'Pérez',
    notes: '',
    paymentMethod: 'cash',
    phone: '5491123456789',
    shippingAddress: '',
  })

  assert.equal(withoutAcceptance.success, false)
  if (!withoutAcceptance.success) {
    assert.equal(
      withoutAcceptance.error.issues[0]?.message,
      'Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar.',
    )
  }

  assert.equal(
    checkoutSchema.safeParse({
      firstName: '',
      deliveryMethod: 'pickup',
      lastName: '',
      notes: '',
      paymentMethod: 'cash',
      phone: '123',
      shippingAddress: '',
    }).success,
    false,
  )

  assert.equal(
    checkoutSchema.safeParse({
      firstName: 'Ana',
      deliveryMethod: 'pickup',
      lastName: 'Pérez',
      notes: '',
      paymentMethod: 'cash',
      phone: '11abc23456789',
      shippingAddress: '',
    }).success,
    false,
  )
})

test('calcula el descuento por transferencia desde la configuración', () => {
  assert.deepEqual(
    calculateCheckoutTotals(
      [
        { price: 12500, salePrice: 10000, quantity: 2 },
        { price: 4200, salePrice: 4200, quantity: 1 },
      ],
      'transfer',
      10,
    ),
    {
      subtotal: 24200,
      discount: 2420,
      discountPercentage: 10,
      total: 21780,
    },
  )
})

test('normaliza el celular sin persistir datos adicionales', () => {
  assert.equal(normalizePhone('+54 9 11 2345-6789'), '5491123456789')
})

test('reutiliza la clave durante el intento y genera otra para una compra nueva', () => {
  const generatedKeys = ['attempt-1', 'attempt-2']
  const createKey = () => generatedKeys.shift() ?? 'unexpected-key'

  const firstKey = getOrCreateCheckoutAttemptKey(null, createKey)
  assert.equal(getOrCreateCheckoutAttemptKey(firstKey, createKey), 'attempt-1')
  assert.equal(getOrCreateCheckoutAttemptKey(null, createKey), 'attempt-2')
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

test('mantiene los enlaces legales y la divulgación comercial antes de confirmar', async () => {
  const [page, form, summary, acceptance, links] = await Promise.all([
    readCheckoutFile('CheckoutPage.tsx'),
    readCheckoutFile('components/CheckoutForm.tsx'),
    readCheckoutFile('components/OrderSummary.tsx'),
    readCheckoutFile('components/CheckoutTermsAcceptance.tsx'),
    readCheckoutFile('utils/checkout-links.ts'),
  ])
  const checkoutCopy = `${page}\n${form}\n${summary}\n${acceptance}\n${links}`

  assert.match(checkoutCopy, /Términos y Condiciones/)
  assert.match(checkoutCopy, /Política de Privacidad/)
  assert.match(checkoutCopy, /arrepentimiento/i)
  assert.match(checkoutCopy, /pickup/i)
  assert.match(checkoutCopy, /shipping/i)
  assert.match(checkoutCopy, /transfer/i)
  assert.match(checkoutCopy, /cash/i)
  assert.match(checkoutCopy, /coordinar/i)
  assert.equal(checkoutCopy.includes('costo fijo'), false)
  assert.equal(checkoutCopy.includes('fecha garantizada'), false)
})
