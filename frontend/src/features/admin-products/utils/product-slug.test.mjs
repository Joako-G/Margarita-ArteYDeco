import assert from 'node:assert/strict'
import test from 'node:test'

import { createProductSlug } from './product-slug.ts'

test('genera el mismo slug normalizado que el backend', () => {
  assert.equal(createProductSlug('  Pincel Ángulo Nº 2  '), 'pincel-angulo-n-2')
  assert.equal(createProductSlug('Caja + Té / 6 divisiones'), 'caja-te-6-divisiones')
})
