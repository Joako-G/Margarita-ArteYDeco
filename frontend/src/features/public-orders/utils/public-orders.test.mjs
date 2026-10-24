import assert from 'node:assert/strict'
import test from 'node:test'

import { routes } from '../../../config/routes.ts'
import { recoverOrderSchema } from '../schemas/recover-order.schema.ts'
import { isValidOrderNumber, normalizeOrderNumber } from './last-order.ts'
import { getPublicOrderStatusDetails } from './public-order-status.ts'
import {
  canResumePublicPayment,
  getPublicPaymentMethodLabel,
  getPublicPaymentStatusDetails,
} from './public-order-payment-status.ts'
import { getPublicOrderBackAction } from './public-order-navigation.ts'
import {
  getRecoveryErrorFeedback,
  isGuestSessionRequired,
  isOrderSessionUnavailable,
} from './public-order-errors.ts'

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
