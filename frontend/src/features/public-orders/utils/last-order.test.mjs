import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearLastOrderNumber,
  getLastOrderNumber,
  isValidOrderNumber,
  normalizeOrderNumber,
  setLastOrderNumber,
} from './last-order.ts'

function createLocalStorageMock() {
  const store = new Map()

  return {
    getItem: (key) => store.get(key) ?? null,
    removeItem: (key) => void store.delete(key),
    setItem: (key, value) => void store.set(key, value),
  }
}

function withLocalStorage(storage, callback) {
  const previousWindow = globalThis.window

  globalThis.window = { localStorage: storage }

  try {
    return callback()
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = previousWindow
    }
  }
}

test('persiste la confirmación como pista local solo cuando el número es válido', () => {
  withLocalStorage(createLocalStorageMock(), () => {
    setLastOrderNumber('MAD-20260802-000001')
    assert.equal(getLastOrderNumber(), 'MAD-20260802-000001')

    setLastOrderNumber('NO-ES-UN-NUMERO')
    assert.equal(getLastOrderNumber(), 'MAD-20260802-000001')
  })
})

test('permite recuperar el número y olvidarlo sin conservar datos personales', () => {
  withLocalStorage(createLocalStorageMock(), () => {
    assert.equal(getLastOrderNumber(), null)

    setLastOrderNumber('MAD-20260802-000002')
    assert.equal(getLastOrderNumber(), 'MAD-20260802-000002')

    clearLastOrderNumber()
    assert.equal(getLastOrderNumber(), null)
  })
})

test('no vuelca datos sensibles como teléfonos, CBU o tokens en la pista local', () => {
  withLocalStorage(createLocalStorageMock(), () => {
    setLastOrderNumber('5491123456789')
    setLastOrderNumber('CBU-123456')
    setLastOrderNumber('A'.repeat(43))

    assert.equal(getLastOrderNumber(), null)
  })
})

test('normaliza y valida números sin exponer respuestas distintas', () => {
  assert.equal(normalizeOrderNumber(' mad-20260802-000003 '), 'MAD-20260802-000003')
  assert.equal(isValidOrderNumber('MAD-20260802-000004'), true)
  assert.equal(isValidOrderNumber('no-esta-entre-nosotros'), false)
})
