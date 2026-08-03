export type TurnstileVerificationResultType = 'invalid' | 'unavailable' | 'valid'

export interface ITurnstileVerificationRequest {
  ipAddress: string
  token: string
}
