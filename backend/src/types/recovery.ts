export interface IRecoveryFingerprints {
  ip: string
  orderPhone: string
}

export interface IRecoveryLimit {
  captchaRequired: boolean
  isBlocked: boolean
  retryAfterSeconds: number
}

export interface IRecoveryLimitConfig {
  blockDurationMs: number
  captchaThreshold: number
  maxAttempts: number
  windowMs: number
}
