import assert from 'node:assert/strict'
import test from 'node:test'

import { getRouteMetadata } from './route-metadata.ts'

test('permite indexar únicamente las páginas públicas de descubrimiento', () => {
  assert.equal(getRouteMetadata('/').robots, 'index, follow')
  assert.equal(getRouteMetadata('/productos').robots, 'index, follow')
  assert.equal(getRouteMetadata('/categoria/pinceles').robots, 'index, follow')
  assert.equal(getRouteMetadata('/politica-de-privacidad').robots, 'index, follow')
})

test('genera título y descripción para la política de privacidad', () => {
  const metadata = getRouteMetadata('/politica-de-privacidad')

  assert.match(metadata.title, /^Política de Privacidad/)
  assert.match(metadata.description, /datos personales/)
})

test('genera título y descripción para los términos y condiciones', () => {
  const metadata = getRouteMetadata('/terminos-y-condiciones')

  assert.match(metadata.title, /^Términos y Condiciones/)
  assert.match(metadata.description, /condiciones/)
})

test('evita indexar rutas transaccionales y administrativas', () => {
  assert.equal(getRouteMetadata('/checkout').robots, 'noindex, nofollow')
  assert.equal(getRouteMetadata('/pedido/PED-123').robots, 'noindex, nofollow')
  assert.equal(getRouteMetadata('/admin').robots, 'noindex, nofollow')
})

test('genera títulos específicos para cada área principal', () => {
  assert.match(getRouteMetadata('/admin/productos/nuevo').title, /^Productos/)
  assert.match(getRouteMetadata('/admin/configuracion').title, /^Configuración/)
  assert.match(getRouteMetadata('/ruta-inexistente').title, /^Página no encontrada/)
})
