import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAdminWhatsAppUrl,
  getAdminWhatsAppTemplate,
} from './admin-order-formatters.ts'

const ORDER = {
  business: {
    address: 'Av. Siempre Viva 123',
    businessHours: 'Lunes a viernes de 9 a 18 h',
    businessName: 'Margaritas Arte & Deco',
    mapsUrl: 'https://maps.google.com/example',
  },
  customer: { firstName: 'Ana', lastName: 'Pérez', phone: '+54 9 11 5555-1234' },
  orderNumber: 'MAD-20260803-000001',
}

test('genera enlaces wa.me con teléfono normalizado y mensaje codificado', () => {
  assert.equal(
    buildAdminWhatsAppUrl('+54 9 11 5555-1234', 'Hola Ana, ¿cómo estás?'),
    'https://wa.me/5491155551234?text=Hola%20Ana%2C%20%C2%BFc%C3%B3mo%20est%C3%A1s%3F',
  )
})

test('prepara el aviso de retiro con dirección, horarios y ubicación', () => {
  const message = getAdminWhatsAppTemplate(ORDER, 'ready')

  assert.match(message, /MAD-20260803-000001/)
  assert.match(message, /Av\. Siempre Viva 123/)
  assert.match(message, /Lunes a viernes de 9 a 18 h/)
  assert.match(message, /https:\/\/maps\.google\.com\/example/)
})

test('prepara el recordatorio sin afirmar que el mensaje fue enviado', () => {
  const message = getAdminWhatsAppTemplate(ORDER, 'transferReminder')

  assert.match(message, /pendiente de pago por transferencia/)
  assert.doesNotMatch(message, /enviado|entregado|leído/)
})
