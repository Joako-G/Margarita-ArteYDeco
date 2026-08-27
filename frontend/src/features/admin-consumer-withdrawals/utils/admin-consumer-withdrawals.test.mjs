import assert from 'node:assert/strict'
import test from 'node:test'

import {
  argentinaDateTimeLocalToIso,
  buildAdminConsumerWithdrawalSearchParams,
  calculateAdminConsumerWithdrawalRefundTotal,
  getAdminConsumerWithdrawalActionCopy,
  getAdminConsumerWithdrawalActionErrorMessage,
  getAdminConsumerWithdrawalEventCopy,
  getAdminConsumerWithdrawalGuidance,
  getAdminConsumerWithdrawalProgress,
  getArgentinaDateTimeLocal,
  parseAdminConsumerWithdrawalFilters,
} from './admin-consumer-withdrawals.ts'
import { adminConsumerWithdrawalActionSchema } from '../schemas/admin-consumer-withdrawal.schema.ts'

test('separa el gasto adicional del total de la compra al calcular el reintegro', () => {
  assert.equal(calculateAdminConsumerWithdrawalRefundTotal(8910, 0, 0), 8910)
  assert.equal(calculateAdminConsumerWithdrawalRefundTotal(8910, 0, 2500), 11410)
})

test('usa la hora argentina para contingencias administrativas', () => {
  const utcInstant = new Date('2026-08-21T21:55:00.000Z')
  assert.equal(getArgentinaDateTimeLocal(utcInstant), '2026-08-21T18:55')
  assert.equal(
    argentinaDateTimeLocalToIso('2026-08-21T18:55'),
    '2026-08-21T21:55:00.000Z',
  )
})

test('exige que aptas y no aptas cubran todas las unidades recibidas', () => {
  const result = adminConsumerWithdrawalActionSchema.safeParse({
    hasReturnShippingExpense: false,
    note: 'Inspección de prueba',
    publicExplanation: '',
    reference: '',
    refundAmountConfirmed: false,
    returnItems: [{
      nonRestockableQuantity: '0',
      orderItemId: '22000000-0000-4000-8000-000000000001',
      orderedQuantity: 2,
      productName: 'Producto de prueba',
      restockableQuantity: '1',
    }],
    returnShippingRefundAmount: '0',
  })
  assert.equal(result.success, false)
})

test('normaliza filtros inválidos con valores operativos seguros', () => {
  const filters = parseAdminConsumerWithdrawalFilters(new URLSearchParams('page=-2&status=invalid'))
  assert.equal(filters.page, 1)
  assert.equal(filters.status, 'all')
  assert.equal(filters.sort, 'newest')
})

test('serializa filtros distintos de los predeterminados', () => {
  const params = buildAdminConsumerWithdrawalSearchParams({ compliance: 'attention', linkage: 'unlinked', page: 2, pageSize: 20, search: 'AR-123', sort: 'oldest', status: 'under_review' })
  assert.equal(params.get('compliance'), 'attention')
  assert.equal(params.get('linkage'), 'unlinked')
  assert.equal(params.get('page'), '2')
})

test('explica los errores administrativos sin ocultar el próximo paso', () => {
  assert.match(
    getAdminConsumerWithdrawalActionErrorMessage('WITHDRAWAL_UPDATE_CONFLICT'),
    /Actualizá el detalle/,
  )
  assert.match(
    getAdminConsumerWithdrawalActionErrorMessage('ADMIN_FORBIDDEN'),
    /Volvé a iniciar sesión/,
  )
  assert.match(
    getAdminConsumerWithdrawalActionErrorMessage('INVALID_CSRF_TOKEN'),
    /seguridad de la sesión/,
  )
  assert.match(
    getAdminConsumerWithdrawalActionErrorMessage('WITHDRAWAL_REFUND_TOTAL_MISMATCH'),
    /no coincide con el desglose/,
  )
  assert.match(
    getAdminConsumerWithdrawalActionErrorMessage(null),
    /no fue modificado/,
  )
})

test('presenta las decisiones con palabras operativas y no técnicas', () => {
  const applicable = getAdminConsumerWithdrawalActionCopy('determineApplicable')
  const notApplicable = getAdminConsumerWithdrawalActionCopy('determineNotApplicable')

  assert.equal(applicable.confirmLabel, 'Continuar con la solicitud')
  assert.match(applicable.title, /cancelación o devolución/)
  assert.equal(notApplicable.confirmLabel, 'Guardar decisión')
  assert.doesNotMatch(notApplicable.description, /inmutable|payload|status/)
  assert.match(applicable.notePlaceholder, /Compra y plazo/)
  assert.match(notApplicable.publicExplanationPlaceholder, /Revisamos tu solicitud/)
})

test('explica el próximo paso y diferencia iniciar de confirmar un reintegro', () => {
  const request = {
    order: { id: 'order-1' },
    refund: { status: 'pending' },
    requestStatus: 'applicable',
    return: { status: 'not_required' },
  }
  const pending = getAdminConsumerWithdrawalGuidance(request)
  const completed = getAdminConsumerWithdrawalGuidance({
    ...request,
    refund: { status: 'succeeded' },
  })

  assert.equal(pending.recommendedAction, 'markRefundProcessing')
  assert.match(pending.description, /confirmalo únicamente después/)
  assert.equal(completed.recommendedAction, 'close')
  assert.match(
    getAdminConsumerWithdrawalActionCopy('confirmManualRefund').referencePlaceholder,
    /operación 845219/,
  )
  assert.match(
    getAdminConsumerWithdrawalActionCopy('correctManualRefund').description,
    /valor anterior seguirá visible/,
  )
})

test('marca los pasos como completos solo después de alcanzar cada etapa', () => {
  const newRequest = {
    order: null,
    refund: { status: 'not_required' },
    requestStatus: 'received',
    return: { status: 'not_required' },
  }
  const initialProgress = getAdminConsumerWithdrawalProgress(newRequest)
  const completedProgress = getAdminConsumerWithdrawalProgress({
    ...newRequest,
    order: { id: 'order-1' },
    requestStatus: 'closed',
  })

  assert.deepEqual(
    initialProgress.map((step) => step.done),
    [false, false, false, false, false, false],
  )
  assert.deepEqual(
    completedProgress.map((step) => step.done),
    [true, true, true, true, true, true],
  )
})

test('traduce los eventos técnicos del historial a acciones comprensibles', () => {
  const submitted = getAdminConsumerWithdrawalEventCopy({
    actorLabel: 'Sistema',
    createdAt: '2026-08-20T21:19:00.000Z',
    description: 'withdrawal submitted',
    id: 'event-1',
    type: 'withdrawal_submitted',
  })
  const customNote = getAdminConsumerWithdrawalEventCopy({
    actorLabel: 'Administración',
    createdAt: '2026-08-20T21:22:00.000Z',
    description: 'Compra confirmada por WhatsApp',
    id: 'event-2',
    type: 'verification_requested',
  })

  assert.deepEqual(submitted, {
    description: 'La persona envió la solicitud de arrepentimiento.',
    title: 'Solicitud recibida',
  })
  assert.equal(customNote.title, 'Verificación solicitada')
  assert.equal(customNote.description, 'Nota del negocio: Compra confirmada por WhatsApp')
})
