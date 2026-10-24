import { z } from 'zod'

import type { PaymentProviderEnvironment } from './types.js'

const mercadoPagoConfigSchema = z.object({
  MP_ACCESS_TOKEN: z.string().trim().min(1).optional(),
  MP_API_BASE_URL: z.url().default('https://api.mercadopago.com'),
  MP_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  MP_FAILURE_URL: z.url().optional(),
  MP_FRONTEND_ORIGIN: z.url().refine((value) => {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && url.origin === value
  }, 'MP_FRONTEND_ORIGIN must be an HTTP or HTTPS origin without a path').default('http://localhost:5173'),
  MP_ENABLED: z.enum(['0', '1']).default('0'),
  MP_EXCLUDED_PAYMENT_TYPE_IDS: z.string().trim().optional(),
  MP_NOTIFICATION_URL: z.url().optional(),
  MP_PENDING_URL: z.url().optional(),
  MP_SUCCESS_URL: z.url().optional(),
  MP_WEBHOOK_SECRET: z.string().trim().min(32).optional(),
})

export interface MercadoPagoConfig {
  accessToken: string | null
  apiBaseUrl: string
  environment: PaymentProviderEnvironment
  enabled: boolean
  excludedPaymentTypeIds: readonly string[]
  failureUrl: string | null
  frontendOrigin: string
  notificationUrl: string | null
  pendingUrl: string | null
  successUrl: string | null
  validationError: string | null
  webhookSecret: string | null
}

export function loadMercadoPagoConfig(
  source: NodeJS.ProcessEnv = process.env,
): MercadoPagoConfig {
  const parsed = mercadoPagoConfigSchema.safeParse(source)

  if (!parsed.success) {
    return {
      accessToken: null,
      apiBaseUrl: 'https://api.mercadopago.com',
      environment: 'sandbox',
      enabled: false,
      excludedPaymentTypeIds: [],
      failureUrl: null,
      frontendOrigin: 'http://localhost:5173',
      notificationUrl: null,
      pendingUrl: null,
      successUrl: null,
      validationError: 'Mercado Pago configuration is invalid',
      webhookSecret: null,
    }
  }

  const value = parsed.data
  const hasRequiredCredentials = value.MP_ENABLED === '0' || (
    value.MP_ACCESS_TOKEN !== undefined && value.MP_WEBHOOK_SECRET !== undefined
  )
  const excludedPaymentTypeIds = (value.MP_EXCLUDED_PAYMENT_TYPE_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const hasRequiredOrderConfig = value.MP_ENABLED === '0' || (
    value.MP_SUCCESS_URL !== undefined &&
    value.MP_PENDING_URL !== undefined &&
    value.MP_FAILURE_URL !== undefined &&
    value.MP_NOTIFICATION_URL !== undefined &&
    excludedPaymentTypeIds.length > 0 &&
    !excludedPaymentTypeIds.some((id) => id === 'account_money' || id === 'debit_card')
  )
  const baseUrlIsProvider = new URL(value.MP_API_BASE_URL).hostname === 'api.mercadopago.com'

  if (!hasRequiredCredentials || !hasRequiredOrderConfig || !baseUrlIsProvider) {
    return {
      accessToken: null,
      apiBaseUrl: value.MP_API_BASE_URL,
      environment: value.MP_ENVIRONMENT,
      enabled: false,
      excludedPaymentTypeIds,
      failureUrl: value.MP_FAILURE_URL ?? null,
      frontendOrigin: new URL(value.MP_FRONTEND_ORIGIN).origin,
      notificationUrl: value.MP_NOTIFICATION_URL ?? null,
      pendingUrl: value.MP_PENDING_URL ?? null,
      successUrl: value.MP_SUCCESS_URL ?? null,
      validationError: 'Mercado Pago configuration is incomplete or environment-mismatched',
      webhookSecret: value.MP_WEBHOOK_SECRET ?? null,
    }
  }

  return {
    accessToken: value.MP_ACCESS_TOKEN ?? null,
    apiBaseUrl: value.MP_API_BASE_URL,
    environment: value.MP_ENVIRONMENT,
    enabled: value.MP_ENABLED === '1',
    excludedPaymentTypeIds,
    failureUrl: value.MP_FAILURE_URL ?? null,
    frontendOrigin: new URL(value.MP_FRONTEND_ORIGIN).origin,
    notificationUrl: value.MP_NOTIFICATION_URL ?? null,
    pendingUrl: value.MP_PENDING_URL ?? null,
    successUrl: value.MP_SUCCESS_URL ?? null,
    validationError: null,
    webhookSecret: value.MP_WEBHOOK_SECRET ?? null,
  }
}
