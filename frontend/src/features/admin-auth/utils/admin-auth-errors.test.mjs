import assert from 'node:assert/strict'
import test from 'node:test'

import { mapAdminAuthError } from './admin-auth-error-messages.ts'

test('keeps invalid administrator credentials indistinguishable', () => {
  assert.equal(
    mapAdminAuthError('INVALID_ADMIN_CREDENTIALS', 401),
    'El correo o la contraseña no son correctos.',
  )
})

test('explains login throttling without encouraging immediate retries', () => {
  assert.match(mapAdminAuthError(null, 429), /Esperá unos minutos/)
})

test('uses a recoverable connection message for unavailable services', () => {
  assert.match(mapAdminAuthError('ADMIN_AUTH_UNAVAILABLE', 503), /Intentá nuevamente/)
})
