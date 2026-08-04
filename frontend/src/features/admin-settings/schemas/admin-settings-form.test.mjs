import assert from 'node:assert/strict'
import test from 'node:test'

import {
  adminSettingsFormSchema,
  normalizeSettingsDigits,
} from './admin-settings-form.schema.ts'

const VALID_SETTINGS = {
  address: 'Av. Siempre Viva 123',
  bankName: 'Banco Nación',
  businessHours: 'Lunes a viernes de 9 a 18',
  businessName: 'Margaritas Arte & Deco',
  facebook: '',
  instagram: 'https://instagram.com/margaritas',
  lowStockThreshold: '5',
  mapsUrl: 'https://maps.google.com/?q=local',
  transferAlias: 'MARGARITAS.ARTE',
  transferCbu: '1234 5678 9012 3456 7890 12',
  transferDiscount: '10',
  whatsapp: '+54 9 11 5555-1234',
}

test('acepta la configuración operativa completa', () => {
  assert.equal(adminSettingsFormSchema.safeParse(VALID_SETTINGS).success, true)
})

test('exige enlaces HTTPS para ubicación y redes', () => {
  assert.equal(adminSettingsFormSchema.safeParse({
    ...VALID_SETTINGS,
    mapsUrl: 'http://maps.google.com/local',
  }).success, false)
  assert.equal(adminSettingsFormSchema.safeParse({
    ...VALID_SETTINGS,
    instagram: 'javascript:alert(1)',
  }).success, false)
})

test('valida el CBU, el descuento y el umbral de stock', () => {
  assert.equal(adminSettingsFormSchema.safeParse({
    ...VALID_SETTINGS,
    transferCbu: '123',
  }).success, false)
  assert.equal(adminSettingsFormSchema.safeParse({
    ...VALID_SETTINGS,
    transferDiscount: '101',
  }).success, false)
  assert.equal(adminSettingsFormSchema.safeParse({
    ...VALID_SETTINGS,
    lowStockThreshold: '2.5',
  }).success, false)
})

test('normaliza únicamente los dígitos enviados al Backend', () => {
  assert.equal(normalizeSettingsDigits('+54 9 11 5555-1234'), '5491155551234')
  assert.equal(normalizeSettingsDigits('1234 5678 9012 3456 7890 12'), '1234567890123456789012')
})
