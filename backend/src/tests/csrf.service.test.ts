import { describe, expect, it } from 'vitest'

import { CsrfService } from '../services/csrf.service.js'

describe('CsrfService', () => {
  const service = new CsrfService('test-only-hmac-secret-at-least-32-characters')

  it('creates signed, unique tokens and rejects tampering', () => {
    const first = service.createToken()
    const second = service.createToken()
    const replacement = first.endsWith('A') ? 'B' : 'A'
    const tampered = `${first.slice(0, -1)}${replacement}`

    expect(first).not.toBe(second)
    expect(service.verifyToken(first)).toBe(true)
    expect(service.verifyToken(tampered)).toBe(false)
    expect(service.verifyToken('invalid')).toBe(false)
  })
})
