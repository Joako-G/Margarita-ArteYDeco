import assert from 'node:assert/strict'
import test from 'node:test'

import { adaptPublicSettings } from './settings-adapter.ts'

test('adapts every public setting without adding private banking fields', () => {
  const settings = adaptPublicSettings({
    address: 'Dirección de prueba',
    businessHours: 'Lunes a viernes',
    businessName: 'Margaritas Arte & Deco',
    facebook: null,
    id: 'settings-id',
    instagram: 'https://instagram.com/margaritas',
    logoUrl: null,
    mapsUrl: 'https://maps.google.com/example',
    transferDiscount: 10,
    whatsapp: '5491100000000',
  })

  assert.equal(settings.logoUrl, null)
  assert.equal(settings.transferDiscount, 10)
  assert.equal('transferAlias' in settings, false)
  assert.equal('transferCbu' in settings, false)
})
