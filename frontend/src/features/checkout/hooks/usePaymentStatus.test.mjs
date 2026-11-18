import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getMercadoPagoReturnSignal,
  shouldContinuePaymentStatusPolling,
  getPaymentStatusPollingInterval,
  getPaymentStatusPresentation,
  shouldPollPaymentStatus,
} from '../utils/payment-status.ts'

test('polls only while payment status is non-terminal', () => {
  assert.equal(shouldPollPaymentStatus('pending'), true)
  assert.equal(shouldPollPaymentStatus('approved'), false)
  assert.equal(shouldPollPaymentStatus('rejected'), false)
  assert.equal(shouldPollPaymentStatus('expired'), false)
  assert.equal(shouldPollPaymentStatus('in_process'), true)
  assert.equal(shouldPollPaymentStatus('manual_review'), false)
  assert.equal(shouldPollPaymentStatus(undefined), false)
})

test('continues bounded polling when an approved return meets stale rejected state', () => {
  assert.equal(shouldContinuePaymentStatusPolling('rejected', true), true)
  assert.equal(shouldContinuePaymentStatusPolling('pending', true), true)
  assert.equal(shouldContinuePaymentStatusPolling('approved', true), false)
  assert.equal(shouldContinuePaymentStatusPolling('rejected', false), false)
})

test('starts polling quickly and backs off to a bounded interval', () => {
  assert.equal(getPaymentStatusPollingInterval(0), 4_000)
  assert.equal(getPaymentStatusPollingInterval(1), 6_000)
  assert.equal(getPaymentStatusPollingInterval(99), 10_000)
})

test('shows provisional approval until the backend provides the authoritative state', () => {
  assert.equal(getPaymentStatusPresentation('approved', undefined), 'provisional-approved')
  assert.equal(getPaymentStatusPresentation('approved', 'pending'), 'provisional-approved')
  assert.equal(getPaymentStatusPresentation('approved', 'rejected'), 'provisional-approved')
  assert.equal(getPaymentStatusPresentation('approved', 'approved'), 'approved')
})

test('accepts a matching approved return signal without changing payment state', () => {
  assert.equal(
    getMercadoPagoReturnSignal(
      new URLSearchParams('status=approved&external_reference=MAD-20260925-000001'),
      'MAD-20260925-000001',
    ),
    'approved',
  )
})

test('ignores stale or ambiguous return parameters', () => {
  assert.equal(
    getMercadoPagoReturnSignal(
      new URLSearchParams('status=approved&external_reference=MAD-20260924-000001'),
      'MAD-20260925-000001',
    ),
    'ambiguous',
  )
  assert.equal(
    getMercadoPagoReturnSignal(
      new URLSearchParams('status=approved&collection_status=rejected'),
      'MAD-20260925-000001',
    ),
    'ambiguous',
  )
  assert.equal(
    getMercadoPagoReturnSignal(new URLSearchParams('status=unknown'), 'MAD-20260925-000001'),
    'ambiguous',
  )
})
