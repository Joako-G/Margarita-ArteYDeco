export interface PaymentSchedulerValidationInput {
  approved: boolean
  cadenceSeconds: number
  httpSupported: boolean
  plan: 'managed' | 'supabase_free'
  quotaPerHour: number
}

export function validatePaymentScheduler(input: PaymentSchedulerValidationInput): string | null {
  const minimumHourlyQuota = Math.ceil(3_600 / input.cadenceSeconds)
  if (input.cadenceSeconds < 60) return 'Scheduler cadence must be at least 60 seconds'
  if (!input.httpSupported) return 'Scheduler HTTP support is not validated'
  if (input.quotaPerHour < minimumHourlyQuota) return 'Scheduler quota is insufficient for the configured cadence'
  if (input.plan === 'managed' && !input.approved) return 'Managed scheduler approval is required'
  return null
}
