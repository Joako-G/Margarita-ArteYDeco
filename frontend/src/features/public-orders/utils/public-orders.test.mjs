import assert from 'node:assert/strict'
import test from 'node:test'

import { recoverOrderSchema } from '../schemas/recover-order.schema.ts'
import { isValidOrderNumber, normalizeOrderNumber } from './last-order.ts'
import { getPublicOrderStatusDetails } from './public-order-status.ts'
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
