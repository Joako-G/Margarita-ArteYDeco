import assert from 'node:assert/strict'
import test from 'node:test'

import { sanitizeAdminRedirectPath } from './admin-route-path.ts'

test('restores only an internal administrator destination', () => {
  assert.equal(sanitizeAdminRedirectPath('/admin?tab=orders'), '/admin?tab=orders')
})

test('rejects external and login redirect destinations', () => {
  assert.equal(sanitizeAdminRedirectPath('//example.com'), '/admin')
  assert.equal(sanitizeAdminRedirectPath('/admin/login'), '/admin')
  assert.equal(sanitizeAdminRedirectPath('/productos'), '/admin')
})
