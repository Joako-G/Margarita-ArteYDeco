import assert from 'node:assert/strict'
import test from 'node:test'

import { getAdminSettingsErrorMessage } from './admin-settings-errors.ts'

test('avisa cuando la configuración cambió en otra sesión', () => {
  assert.match(
    getAdminSettingsErrorMessage('SETTINGS_UPDATE_CONFLICT'),
    /Recargá la página antes de continuar/,
  )
})

test('explica fallos de almacenamiento de logo y configuración faltante', () => {
  assert.match(
    getAdminSettingsErrorMessage('SETTINGS_LOGO_STORAGE_UNAVAILABLE'),
    /Intentá nuevamente en unos minutos/,
  )
  assert.match(getAdminSettingsErrorMessage('SETTINGS_MISSING'), /no está disponible/)
})

test('entrega un mensaje de guardado genérico por defecto', () => {
  assert.equal(
    getAdminSettingsErrorMessage('WHATEVER'),
    'No pudimos guardar los cambios. Revisá los datos e intentá nuevamente.',
  )
})
