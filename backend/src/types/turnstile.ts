export type TurnstileVerificationResultType = 'invalid' | 'unavailable' | 'valid'

export interface ITurnstileVerificationRequest {
  action?: 'consumer_withdrawal' | 'order_recovery'
  ipAddress: string
  token: string
}
