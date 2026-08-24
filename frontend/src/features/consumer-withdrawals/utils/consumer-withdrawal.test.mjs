import assert from 'node:assert/strict'
import test from 'node:test'

import { consumerWithdrawalSchema } from '../schemas/consumer-withdrawal.schema.ts'

test('exige pedido o declaración de número no disponible', () => {
  assert.equal(consumerWithdrawalSchema.safeParse({ comment: '', orderNumber: '', orderNumberUnavailable: false, phone: '3511234567' }).success, false)
})

test('permite registrar sin número cuando se declara no disponible', () => {
  assert.equal(consumerWithdrawalSchema.safeParse({ comment: '', orderNumber: '', orderNumberUnavailable: true, phone: '3511234567' }).success, true)
})
