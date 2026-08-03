import { describe, expect, it } from 'vitest'

import { RecoveryProtectionService } from '../services/recovery-protection.service.js'

const SECRET = 'test-only-recovery-secret-at-least-32-characters'

describe('RecoveryProtectionService', () => {
  it('creates stable, domain-separated fingerprints without retaining raw identifiers', () => {
    const service = new RecoveryProtectionService(SECRET)
    const input = ['203.0.113.7', 'MAD-20260802-000001', '5491123456789'] as const
    const first = service.createFingerprints(...input)
    const second = service.createFingerprints(...input)

    expect(first).toEqual(second)
    expect(first.ip).toMatch(/^\\x[0-9a-f]{64}$/)
    expect(first.orderPhone).toMatch(/^\\x[0-9a-f]{64}$/)
    expect(first.ip).not.toBe(first.orderPhone)
    expect(JSON.stringify(first)).not.toContain(input[0])
    expect(JSON.stringify(first)).not.toContain(input[1])
    expect(JSON.stringify(first)).not.toContain(input[2])
  })

  it('changes fingerprints when the protected values change', () => {
    const service = new RecoveryProtectionService(SECRET)
    const baseline = service.createFingerprints(
      '203.0.113.7',
      'MAD-20260802-000001',
      '5491123456789',
    )

    expect(service.createFingerprints(
      '203.0.113.8',
      'MAD-20260802-000001',
      '5491123456789',
    ).ip).not.toBe(baseline.ip)
    expect(service.createFingerprints(
      '203.0.113.7',
      'MAD-20260802-000002',
      '5491123456789',
    ).orderPhone).not.toBe(baseline.orderPhone)
  })

  it('compares normalized phones without accepting an absent candidate', () => {
    const service = new RecoveryProtectionService(SECRET)

    expect(service.phoneMatches('5491123456789', '5491123456789')).toBe(true)
    expect(service.phoneMatches('5491123456789', '5491187654321')).toBe(false)
    expect(service.phoneMatches('5491123456789', null)).toBe(false)
  })
})
