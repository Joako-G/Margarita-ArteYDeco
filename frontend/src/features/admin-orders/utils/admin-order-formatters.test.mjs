import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import {
  buildAdminWhatsAppUrl,
  formatPaymentUpdatedAt,
  getAdminWhatsAppTemplate,
  isRefundPending,
  isPaidWithoutStock,
  PAYMENT_RECONCILIATION_DETAILS,
} from './admin-order-formatters.ts'
import { formatAdminDate } from '../../../shared/utils/format-admin-date.ts'
import { consultAdminPayment, getAdminPaymentConsultationFeedback } from './admin-payment-consultation.ts'

const ORDER = {
  business: {
    address: 'Av. Siempre Viva 123',
    businessHours: 'Lunes a viernes de 9 a 18 h',
    businessName: 'Margaritas Arte & Deco',
    mapsUrl: 'https://maps.google.com/example',
  },
  customer: { firstName: 'Ana', lastName: 'Pérez', phone: '+54 9 11 5555-1234' },
  deliveryMethod: 'pickup',
  orderNumber: 'MAD-20260803-000001',
  shippingAddress: null,
}

test('genera enlaces wa.me con teléfono normalizado y mensaje codificado', () => {
  assert.equal(
    buildAdminWhatsAppUrl('+54 9 11 5555-1234', 'Hola Ana, ¿cómo estás?'),
    'https://wa.me/5491155551234?text=Hola%20Ana%2C%20%C2%BFc%C3%B3mo%20est%C3%A1s%3F',
  )
})

test('prepara el aviso de retiro con dirección, horarios y ubicación', () => {
  const message = getAdminWhatsAppTemplate(ORDER, 'ready')

  assert.match(message, /MAD-20260803-000001/)
  assert.match(message, /Av\. Siempre Viva 123/)
  assert.match(message, /Lunes a viernes de 9 a 18 h/)
  assert.match(message, /https:\/\/maps\.google\.com\/example/)
})

test('prepara el aviso de envío sin indicar que el pedido debe retirarse', () => {
  const message = getAdminWhatsAppTemplate(
    {
      ...ORDER,
      deliveryMethod: 'shipping',
      shippingAddress: 'Belgrano 607, San Salvador de Jujuy',
    },
    'ready',
  )

  assert.match(message, /ya está listo/)
  assert.match(message, /Belgrano 607, San Salvador de Jujuy/)
  assert.doesNotMatch(message, /retirar/)
})

test('prepara el recordatorio sin afirmar que el mensaje fue enviado', () => {
  const message = getAdminWhatsAppTemplate(ORDER, 'transferReminder')

  assert.match(message, /pendiente de pago por transferencia/)
  assert.doesNotMatch(message, /enviado|entregado|leído/)
})

test('distingue la conciliación del estado operativo del pedido', () => {
  assert.equal(PAYMENT_RECONCILIATION_DETAILS.manual_review.label, 'Revisión manual')
  assert.equal(formatPaymentUpdatedAt('2026-08-03T15:05:00.000Z'), 'Actualizado 3 ago 2026, 12:05 p. m.')
  assert.equal(formatPaymentUpdatedAt(null), 'Sin actualización de pago')
})

test('formats the same absolute instant across host timezones without changing the ISO value', () => {
  const instant = '2026-08-04T01:05:00.000Z'
  const expected = formatAdminDate(instant)
  assert.match(expected, /^3 ago 2026, 10:05 p\. m\.$/)
  for (const zone of ['UTC', 'Pacific/Auckland']) {
    const result = spawnSync(process.execPath, [
      '--experimental-strip-types',
      '--input-type=module',
      '-e', `import { formatAdminDate } from './src/shared/utils/format-admin-date.ts'; console.log(formatAdminDate('${instant}'))`,
    ], { cwd: new URL('../../../..', import.meta.url), encoding: 'utf8', env: { ...process.env, TZ: zone } })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), expected)
  }
  assert.equal(new Date(instant).toISOString(), instant)
})

test('reads the authoritative order even when the provider request fails', async () => {
  const failure = new Error('Provider unavailable')
  const order = { paymentStatus: 'paid', inventoryAllocationActive: false, status: 'pending' }
  let readCount = 0
  const result = await consultAdminPayment(
    async () => { throw failure },
    async () => { readCount++; return order },
  )

  assert.equal(readCount, 1)
  assert.equal(result.syncError, failure)
  assert.equal(result.order, order)
  assert.equal(getAdminPaymentConsultationFeedback(result).type, 'warning')
  assert.match(getAdminPaymentConsultationFeedback(result).message, /pedido actualizado figura como pagado/)
})

test('reports missing audit independently from the paid order state', async () => {
  const result = await consultAdminPayment(
    async () => ({ auditRecorded: false }),
    async () => ({ paymentStatus: 'paid', inventoryAllocationActive: true, status: 'pending' }),
  )

  assert.equal(result.syncError, null)
  assert.equal(getAdminPaymentConsultationFeedback(result).type, 'warning')
  assert.match(getAdminPaymentConsultationFeedback(result).message, /no se pudo registrar/)
})

test('keeps a failed provider consultation pending when the refreshed order is unpaid', async () => {
  const result = await consultAdminPayment(
    async () => { throw new Error('Provider unavailable') },
    async () => ({ paymentStatus: 'pending', inventoryAllocationActive: false, status: 'pending' }),
  )

  assert.equal(getAdminPaymentConsultationFeedback(result).type, 'error')
  assert.match(getAdminPaymentConsultationFeedback(result).message, /no figura como pagado/)
})

test('does not claim a provider result if both consultation and refresh fail', async () => {
  await assert.rejects(
    consultAdminPayment(
      async () => { throw new Error('Provider unavailable') },
      async () => { throw new Error('Order unavailable') },
    ),
    /Order unavailable/,
  )
})

test('reports successful consultation only from the refreshed paid order', async () => {
  const result = await consultAdminPayment(
    async () => ({ auditRecorded: true }),
    async () => ({ paymentStatus: 'paid', inventoryAllocationActive: true, status: 'pending' }),
  )

  assert.equal(getAdminPaymentConsultationFeedback(result).type, 'success')
})

test('flags only cancelled Mercado Pago orders with a confirmed payment as pending refund', () => {
  const base = { paymentMethod: 'mercado_pago', paymentStatus: 'paid', status: 'cancelled' }

  assert.equal(isRefundPending(base), true)
  assert.equal(isRefundPending({ ...base, paymentStatus: 'pending' }), false)
  assert.equal(isRefundPending({ ...base, paymentStatus: 'rejected' }), false)
  assert.equal(isRefundPending({ ...base, status: 'pending' }), false)
  assert.equal(isRefundPending({ ...base, status: 'delivered' }), false)
  assert.equal(isRefundPending({ ...base, paymentMethod: 'cash' }), false)
  assert.equal(isRefundPending({ ...base, paymentMethod: 'bank_transfer' }), false)
})

test('flags only pending Mercado Pago orders paid after the stock was released as paid without stock', () => {
  const base = { inventoryAllocationActive: false, paymentMethod: 'mercado_pago', paymentStatus: 'paid', status: 'pending' }

  assert.equal(isPaidWithoutStock(base), true)
  assert.equal(isPaidWithoutStock({ ...base, inventoryAllocationActive: true }), false)
  assert.equal(isPaidWithoutStock({ ...base, paymentStatus: 'pending' }), false)
  assert.equal(isPaidWithoutStock({ ...base, status: 'confirmed' }), false)
  assert.equal(isPaidWithoutStock({ ...base, status: 'cancelled' }), false)
  assert.equal(isPaidWithoutStock({ ...base, paymentMethod: 'cash' }), false)
})
