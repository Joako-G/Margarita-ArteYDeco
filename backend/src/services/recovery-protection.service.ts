import { createHmac, timingSafeEqual } from 'node:crypto'

import type { IRecoveryFingerprints } from '../types/recovery.js'

function toBytea(hex: string): string {
  return `\\x${hex}`
}

export interface IRecoveryProtectionService {
  createFingerprints(
    ipAddress: string,
    orderNumber: string,
    phoneNormalized: string,
  ): IRecoveryFingerprints
  phoneMatches(submittedPhone: string, expectedPhone: string | null): boolean
}

export class RecoveryProtectionService implements IRecoveryProtectionService {
  public constructor(private readonly secret: string) {}

  public createFingerprints(
    ipAddress: string,
    orderNumber: string,
    phoneNormalized: string,
  ): IRecoveryFingerprints {
    return {
      ip: toBytea(this.sign('recovery-ip-v1', ipAddress)),
      orderPhone: toBytea(this.sign(
        'recovery-order-phone-v1',
        `${orderNumber}\0${phoneNormalized}`,
      )),
    }
  }

  public phoneMatches(submittedPhone: string, expectedPhone: string | null): boolean {
    const submitted = Buffer.from(this.sign('recovery-phone-v1', submittedPhone), 'hex')
    const expected = Buffer.from(
      this.sign('recovery-phone-v1', expectedPhone ?? 'invalid-recovery-phone'),
      'hex',
    )

    return timingSafeEqual(submitted, expected) && expectedPhone !== null
  }

  private sign(domain: string, value: string): string {
    return createHmac('sha256', this.secret)
      .update(domain)
      .update('\0')
      .update(value)
      .digest('hex')
  }
}
