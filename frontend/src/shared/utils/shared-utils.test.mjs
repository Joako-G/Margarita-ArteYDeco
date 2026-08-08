import assert from 'node:assert/strict'
import test from 'node:test'

import { mergeClassNames } from './class-names.ts'
import { createSlug } from './create-slug.ts'
import { formatPrice } from './format-price.ts'
import { ORDER_STATUS_DETAILS } from './order-status.ts'
import { buildWhatsAppUrl, DEFAULT_WHATSAPP_MESSAGE } from './whatsapp.ts'

test('combina clases ignorando valores vacíos o falsos', () => {
  assert.equal(mergeClassNames('a', 'b', '', null, false, undefined, 'c'), 'a b c')
  assert.equal(mergeClassNames(), '')
})

test('genera slugs guardables a partir de nombres acentuados', () => {
  assert.equal(createSlug('Pincel Ángulo Nº 2'), 'pincel-angulo-n-2')
  assert.equal(createSlug('  Moldes -- de Silicona  '), 'moldes-de-silicona')
  assert.equal(createSlug('Cajas Decoradas!'), 'cajas-decoradas')
})

test('formatea precios en pesos sin decimales', () => {
  assert.equal(formatPrice(1250).replace(/\u00A0/g, ' '), '$ 1.250')
  assert.equal(formatPrice(1000).replace(/\u00A0/g, ' '), '$ 1.000')
  assert.equal(formatPrice(0).replace(/\u00A0/g, ' '), '$ 0')
})

test('describe todos los estados oficiales de pedido con variantes tipadas', () => {
  const statuses = [
    'pending',
    'confirmed',
    'delivered',
    'preparing',
    'ready',
    'picked_up',
    'cancelled',
  ]

  assert.equal(Object.keys(ORDER_STATUS_DETAILS).sort().join(','), statuses.sort().join(','))
  assert.equal(ORDER_STATUS_DETAILS.picked_up.label, 'Retirado')
  assert.equal(ORDER_STATUS_DETAILS.confirmed.label, 'Confirmado')
  assert.equal(ORDER_STATUS_DETAILS.cancelled.variant, 'error')
  assert.equal(ORDER_STATUS_DETAILS.delivered.label, 'Entregado')
})

test('construye enlaces públicos de WhatsApp con mensaje centralizado', () => {
  assert.equal(
    buildWhatsAppUrl('+54 9 11 5555-1234'),
    `https://wa.me/5491155551234?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`,
  )
  assert.equal(
    buildWhatsAppUrl('5491100000000', ' Hola, necesito ayuda. '),
    'https://wa.me/5491100000000?text=Hola%2C%20necesito%20ayuda.',
  )
})
