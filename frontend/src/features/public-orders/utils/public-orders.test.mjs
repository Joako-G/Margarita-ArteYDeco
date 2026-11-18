import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { routes } from '../../../config/routes.ts'
import { recoverOrderSchema } from '../schemas/recover-order.schema.ts'
import { isValidOrderNumber, normalizeOrderNumber } from './last-order.ts'
import { getPublicOrderStatusDetails } from './public-order-status.ts'
import {
  canResumePublicPayment,
  getPublicPaymentMethodLabel,
  getPublicPaymentStatusDetails,
  formatReservationDate,
  getReservationNoticeKind,
  isReservationActive,
  keepMeridiemTogether,
  PUBLIC_PAID_WITHOUT_STOCK_NOTICE,
  PUBLIC_REFUND_NOTICE,
  shouldShowPaidWithoutStockNotice,
  shouldShowRefundNotice,
} from './public-order-payment-status.ts'
import { getPublicOrderBackAction } from './public-order-navigation.ts'
import {
  getRecoveryErrorFeedback,
  isGuestSessionRequired,
  isOrderSessionUnavailable,
} from './public-order-errors.ts'

const publicOrdersDirectory = dirname(fileURLToPath(import.meta.url))

async function readPublicOrdersFile(relativePath) {
  return readFile(resolve(publicOrdersDirectory, '..', relativePath), 'utf8')
}

function createApiError(error, details = {}) {
  return {
    isAxiosError: true,
    response: {
      data: {
        error,
        success: false,
        ...details,
      },
    },
  }
}

test('normaliza y valida el número público de pedido', () => {
  assert.equal(normalizeOrderNumber(' mad-20260802-000001 '), 'MAD-20260802-000001')
  assert.equal(isValidOrderNumber('MAD-20260802-000001'), true)
  assert.equal(isValidOrderNumber('MAD-0001'), false)
})

test('valida recuperación con número y celular completos', () => {
  const result = recoverOrderSchema.safeParse({
    orderNumber: ' mad-20260802-000001 ',
    phone: '5491123456789',
  })

  assert.equal(result.success, true)

  if (result.success) {
    assert.equal(result.data.orderNumber, 'MAD-20260802-000001')
  }

  assert.equal(
    recoverOrderSchema.safeParse({
      orderNumber: 'MAD-0001',
      phone: '123',
    }).success,
    false,
  )
})

test('mantiene indistinguible el error de recuperación y activa CAPTCHA por señal', () => {
  const feedback = getRecoveryErrorFeedback(
    createApiError('ORDER_RECOVERY_FAILED', { captchaRequired: true }),
  )

  assert.equal(feedback.captchaRequired, true)
  assert.equal(feedback.title, 'No pudimos recuperar el pedido con esos datos.')
  assert.equal(feedback.message.includes('celular'), false)
  assert.equal(feedback.message.includes('número'), false)
})

test('convierte el bloqueo temporal en un tiempo de espera legible', () => {
  const feedback = getRecoveryErrorFeedback(
    createApiError('ORDER_RECOVERY_BLOCKED', { retryAfterSeconds: 600 }),
  )

  assert.equal(feedback.retryAfterSeconds, 600)
  assert.equal(feedback.message, 'Intentá nuevamente dentro de 10 minutos.')
})

test('reconoce sesión ausente y pedido no autorizado sin diferenciarlos en la pantalla', () => {
  assert.equal(isOrderSessionUnavailable(createApiError('GUEST_SESSION_REQUIRED')), true)
  assert.equal(isOrderSessionUnavailable(createApiError('ORDER_NOT_AVAILABLE')), true)
  assert.equal(isOrderSessionUnavailable(createApiError('INTERNAL_SERVER_ERROR')), false)
})

test('distingue una sesión ausente para ofrecer recuperación desde la navegación', () => {
  assert.equal(isGuestSessionRequired(createApiError('GUEST_SESSION_REQUIRED')), true)
  assert.equal(isGuestSessionRequired(createApiError('ORDER_NOT_AVAILABLE')), false)
  assert.equal(isGuestSessionRequired(createApiError('INTERNAL_SERVER_ERROR')), false)
})

test('muestra como enviado el estado final de los pedidos con envío', () => {
  assert.equal(getPublicOrderStatusDetails('delivered', 'shipping').label, 'Enviado')
  assert.equal(getPublicOrderStatusDetails('delivered', 'pickup').label, 'Entregado')
  assert.equal(getPublicOrderStatusDetails('ready', 'shipping').label, 'Listo')
})

test('construye la ruta de estado de pago con el número de pedido codificado', () => {
  assert.equal(routes.paymentStatusPath('MAD/20260802'), '/pedido/MAD%2F20260802/pago')
})

test('solo permite continuar Mercado Pago cuando existe un intento reanudable', () => {
  assert.equal(canResumePublicPayment('mercado_pago', 'pending', true), true)
  assert.equal(canResumePublicPayment('mercado_pago', 'rejected', true), true)
  assert.equal(canResumePublicPayment('mercado_pago', 'paid', true), false)
  assert.equal(canResumePublicPayment('mercado_pago', 'manual_review', true), false)
  assert.equal(canResumePublicPayment('mercado_pago', 'expired', true), false)
  assert.equal(canResumePublicPayment('mercado_pago', 'pending', false), false)
  assert.equal(canResumePublicPayment('transfer', 'pending', true), false)
})

test('comunica estados genéricos para transferencia y efectivo', () => {
  assert.equal(getPublicPaymentStatusDetails('transfer', 'pending').label, 'Pendiente de confirmar')
  assert.equal(getPublicPaymentStatusDetails('cash', 'pending').label, 'Pago al retirar')
})

test('projects unresolved Mercado Pago as review and keeps captured payment distinct from fulfillment', () => {
  const review = getPublicPaymentStatusDetails('mercado_pago', 'manual_review')
  const captured = getPublicPaymentStatusDetails('mercado_pago', 'paid')

  assert.equal(review.label, 'Pago en revisión')
  assert.equal(review.variant, 'warning')
  assert.notEqual(review.label, 'Pago rechazado')
  assert.equal(captured.label, 'Pago confirmado')
  assert.equal(getPublicOrderStatusDetails('pending', 'pickup').label, 'Pendiente')
})

test('muestra la etiqueta pública correcta para cada medio de pago', () => {
  assert.equal(getPublicPaymentMethodLabel('mercado_pago'), 'Mercado Pago')
  assert.equal(getPublicPaymentMethodLabel('transfer'), 'Transferencia bancaria')
  assert.equal(getPublicPaymentMethodLabel('cash'), 'Pago en efectivo al retirar')
})

test('usa historial interno y vuelve al catálogo como fallback seguro', () => {
  assert.equal(getPublicOrderBackAction(2), 'history')
  assert.equal(getPublicOrderBackAction(0), 'catalog')
  assert.equal(getPublicOrderBackAction(null), 'catalog')
})

test('distingue una reserva vigente de una vencida', () => {
  const now = Date.parse('2026-10-15T12:00:00.000Z')

  assert.equal(isReservationActive('2026-10-15T20:53:00.000Z', now), true)
  assert.equal(isReservationActive('2026-10-15T11:59:59.000Z', now), false)
  assert.equal(isReservationActive('2026-10-15T12:00:00.000Z', now), false)
  assert.equal(isReservationActive('fecha-invalida', now), false)
})

test('muestra la nota de reserva solo mientras el pedido no está cancelado ni pagado', () => {
  const now = Date.parse('2026-10-15T12:00:00.000Z')
  const future = '2026-10-15T20:53:00.000Z'
  const past = '2026-10-15T11:00:00.000Z'

  assert.equal(getReservationNoticeKind('pending', 'pending', future, now), 'active')
  assert.equal(getReservationNoticeKind('pending', 'rejected', future, now), 'active')
  assert.equal(getReservationNoticeKind('pending', 'pending', past, now), 'expired')
  assert.equal(getReservationNoticeKind('cancelled', 'pending', future, now), null)
  assert.equal(getReservationNoticeKind('cancelled', 'pending', past, now), null)
  assert.equal(getReservationNoticeKind('confirmed', 'paid', past, now), null)
  assert.equal(getReservationNoticeKind('confirmed', 'approved', future, now), null)
  assert.equal(getReservationNoticeKind('pending', 'pending', null, now), null)
})

test('une "a. m." y "p. m." con un espacio que no se parte en dos líneas', () => {
  assert.equal(keepMeridiemTogether('28 oct 2026, 11:44 p. m.'), '28 oct 2026, 11:44 p.\xa0m.')
  assert.equal(keepMeridiemTogether('28 oct 2026, 9:05 a. m.'), '28 oct 2026, 9:05 a.\xa0m.')
  assert.equal(keepMeridiemTogether('28 oct 2026, 11:44 p.' + String.fromCharCode(0x202f) + 'm.'), '28 oct 2026, 11:44 p.\xa0m.')
  assert.equal(keepMeridiemTogether('28 oct 2026, 23:44'), '28 oct 2026, 23:44')
})

test('formatea la fecha de reserva sin dejar un espacio común entre "p." y "m."', () => {
  const formatted = formatReservationDate('2026-10-29T02:44:00.000Z', 'America/Argentina/Buenos_Aires')

  assert.match(formatted, /11:44/)
  assert.doesNotMatch(formatted, /p\. m\./, `unexpected format: ${JSON.stringify(formatted)}`)
})

test('avisa del reembolso solo en pedidos cancelados de Mercado Pago con pago confirmado', () => {
  const base = { paymentMethod: 'mercado_pago', paymentStatus: 'paid', status: 'cancelled' }

  assert.equal(shouldShowRefundNotice(base), true)
  assert.equal(shouldShowRefundNotice({ ...base, paymentStatus: 'approved' }), true)
  assert.equal(shouldShowRefundNotice({ ...base, paymentStatus: 'pending' }), false)
  assert.equal(shouldShowRefundNotice({ ...base, paymentStatus: 'expired' }), false)
  assert.equal(shouldShowRefundNotice({ ...base, status: 'pending' }), false)
  assert.equal(shouldShowRefundNotice({ ...base, paymentMethod: 'cash' }), false)
  assert.equal(shouldShowRefundNotice({ ...base, paymentMethod: 'transfer' }), false)
  assert.equal(
    PUBLIC_REFUND_NOTICE,
    'Tu pedido fue cancelado. Como el pago ya estaba confirmado, nos vamos a comunicar con vos para devolverte el dinero.',
  )
})

test('avisa de la falta de stock solo en pedidos pendientes de Mercado Pago pagados despues de vencer la reserva', () => {
  const now = Date.parse('2026-10-30T12:00:00Z')
  const base = {
    paymentMethod: 'mercado_pago',
    paymentStatus: 'paid',
    reservationExpiresAt: '2026-10-30T11:00:00Z',
    status: 'pending',
  }

  assert.equal(shouldShowPaidWithoutStockNotice(base, now), true)
  assert.equal(shouldShowPaidWithoutStockNotice({ ...base, paymentStatus: 'approved' }, now), true)
  assert.equal(shouldShowPaidWithoutStockNotice({ ...base, reservationExpiresAt: '2026-10-30T13:00:00Z' }, now), false)
  assert.equal(shouldShowPaidWithoutStockNotice({ ...base, reservationExpiresAt: null }, now), false)
  assert.equal(shouldShowPaidWithoutStockNotice({ ...base, paymentStatus: 'pending' }, now), false)
  assert.equal(shouldShowPaidWithoutStockNotice({ ...base, status: 'confirmed' }, now), false)
  assert.equal(shouldShowPaidWithoutStockNotice({ ...base, status: 'cancelled' }, now), false)
  assert.equal(shouldShowPaidWithoutStockNotice({ ...base, paymentMethod: 'cash' }, now), false)
  assert.equal(
    PUBLIC_PAID_WITHOUT_STOCK_NOTICE,
    'Recibimos tu pago, pero tu reserva había vencido y ya no tenemos stock disponible. Nos vamos a comunicar con vos para coordinar la devolución del dinero o una alternativa.',
  )
})

test('renderiza la divulgación de Turnstile antes del desafío en recuperación', async () => {
  const recovery = await readPublicOrdersFile('RecoverOrderPage.tsx')
  const disclosureIndex = recovery.indexOf('<TurnstileDisclosure />')
  const challengeIndex = recovery.indexOf('<TurnstileChallenge')

  assert.notEqual(disclosureIndex, -1)
  assert.notEqual(challengeIndex, -1)
  assert.ok(disclosureIndex < challengeIndex)
})

test('conserva los contratos de seguridad sin modificar CSRF, rate limit o acciones aprobadas', async () => {
  const [security, rateLimit, turnstile] = await Promise.all([
    readFile(resolve(publicOrdersDirectory, '../../../../../backend/src/middlewares/security.middleware.ts'), 'utf8'),
    readFile(resolve(publicOrdersDirectory, '../../../../../backend/src/config/rate-limit-store.ts'), 'utf8'),
    readFile(resolve(publicOrdersDirectory, '../../../../../backend/src/services/turnstile.service.ts'), 'utf8'),
  ])

  assert.match(security, /headerToken !== cookieToken/)
  assert.match(security, /passOnStoreError: false/)
  assert.match(rateLimit, /rate limiting será local y no distribuido/)
  assert.match(turnstile, /consumer_withdrawal.*order_recovery/)
  assert.match(turnstile, /TURNSTILE_SITEVERIFY_URL/)
})
