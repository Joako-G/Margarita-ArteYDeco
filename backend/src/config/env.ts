import { z } from 'zod'

const booleanSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')

const envSchema = z
  .object({
    CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
    ADMIN_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(5),
    ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(60_000).default(900_000),
    ADMIN_SESSION_MAX_AGE_MS: z.coerce.number().int()
      .min(900_000)
      .max(2_592_000_000)
      .default(604_800_000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    PUBLIC_CACHE_MAX_AGE_SECONDS: z.coerce.number().int().min(0).max(300).default(60),
    PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10_000).default(120),
    PUBLIC_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),
    ORDER_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).default(10),
    ORDER_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),
    RECOVERY_BLOCK_DURATION_MS: z.coerce.number().int().min(1_800_000).default(1_800_000),
    RECOVERY_CAPTCHA_THRESHOLD: z.coerce.number().int().min(1).max(5).default(3),
    RECOVERY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(5),
    RECOVERY_WINDOW_MS: z.coerce.number().int().min(60_000).default(900_000),
    SECURITY_HMAC_SECRET: z.string().min(32).optional(),
    STORAGE_SIGNED_URL_REFRESH_SKEW_SECONDS: z.coerce.number().int().min(1).default(60),
    STORAGE_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(3_600),
    SUPABASE_SECRET_KEY: z.string().min(20),
    SUPABASE_URL: z.url(),
    TRUST_PROXY: booleanSchema.default(false),
    TURNSTILE_ALLOWED_HOSTNAMES: z.string().min(1).default('localhost'),
    TURNSTILE_SECRET_KEY: z.string().min(1).max(1_024),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && value.SECURITY_HMAC_SECRET === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'SECURITY_HMAC_SECRET es obligatorio en producción',
        path: ['SECURITY_HMAC_SECRET'],
      })
    }

    if (value.RECOVERY_CAPTCHA_THRESHOLD > value.RECOVERY_MAX_ATTEMPTS) {
      context.addIssue({
        code: 'custom',
        message: 'El umbral de CAPTCHA no puede superar el máximo de intentos',
        path: ['RECOVERY_CAPTCHA_THRESHOLD'],
      })
    }

    if (
      value.STORAGE_SIGNED_URL_REFRESH_SKEW_SECONDS >=
      value.STORAGE_SIGNED_URL_TTL_SECONDS
    ) {
      context.addIssue({
        code: 'custom',
        message: 'El margen de renovación debe ser menor que la vigencia de la URL firmada',
        path: ['STORAGE_SIGNED_URL_REFRESH_SKEW_SECONDS'],
      })
    }

    if (
      value.PUBLIC_CACHE_MAX_AGE_SECONDS >=
      value.STORAGE_SIGNED_URL_TTL_SECONDS - value.STORAGE_SIGNED_URL_REFRESH_SKEW_SECONDS
    ) {
      context.addIssue({
        code: 'custom',
        message: 'La caché pública debe vencer antes que las URLs firmadas',
        path: ['PUBLIC_CACHE_MAX_AGE_SECONDS'],
      })
    }
  })

export interface IEnv {
  adminLoginRateLimitMax: number
  adminLoginRateLimitWindowMs: number
  adminSessionMaxAgeMs: number
  corsAllowedOrigins: readonly string[]
  nodeEnv: 'development' | 'production' | 'test'
  orderRateLimitMax: number
  orderRateLimitWindowMs: number
  port: number
  publicCacheMaxAgeSeconds: number
  publicRateLimitMax: number
  publicRateLimitWindowMs: number
  recoveryBlockDurationMs: number
  recoveryCaptchaThreshold: number
  recoveryMaxAttempts: number
  recoveryWindowMs: number
  securityHmacSecret: string
  storageSignedUrlRefreshSkewSeconds: number
  storageSignedUrlTtlSeconds: number
  supabaseSecretKey: string
  supabaseUrl: string
  trustProxy: boolean
  turnstileAllowedHostnames: readonly string[]
  turnstileSecretKey: string
}

function parseAllowedOrigins(value: string): readonly string[] {
  const origins = [...new Set(value.split(',').map((origin) => origin.trim()).filter(Boolean))]

  for (const origin of origins) {
    const url = new URL(origin)

    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error(`Origen CORS inválido: ${origin}`)
    }
  }

  return origins
}

function parseAllowedHostnames(value: string): readonly string[] {
  const hostnames = [...new Set(
    value.split(',').map((hostname) => hostname.trim().toLowerCase()).filter(Boolean),
  )]

  for (const hostname of hostnames) {
    const url = new URL(`https://${hostname}`)

    if (url.hostname.toLowerCase() !== hostname || url.port !== '' || url.pathname !== '/') {
      throw new Error(`Hostname de Turnstile inválido: ${hostname}`)
    }
  }

  return hostnames
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): IEnv {
  const value = envSchema.parse(source)

  return {
    adminLoginRateLimitMax: value.ADMIN_LOGIN_RATE_LIMIT_MAX,
    adminLoginRateLimitWindowMs: value.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS,
    adminSessionMaxAgeMs: value.ADMIN_SESSION_MAX_AGE_MS,
    corsAllowedOrigins: parseAllowedOrigins(value.CORS_ALLOWED_ORIGINS),
    nodeEnv: value.NODE_ENV,
    orderRateLimitMax: value.ORDER_RATE_LIMIT_MAX,
    orderRateLimitWindowMs: value.ORDER_RATE_LIMIT_WINDOW_MS,
    port: value.PORT,
    publicCacheMaxAgeSeconds: value.PUBLIC_CACHE_MAX_AGE_SECONDS,
    publicRateLimitMax: value.PUBLIC_RATE_LIMIT_MAX,
    publicRateLimitWindowMs: value.PUBLIC_RATE_LIMIT_WINDOW_MS,
    recoveryBlockDurationMs: value.RECOVERY_BLOCK_DURATION_MS,
    recoveryCaptchaThreshold: value.RECOVERY_CAPTCHA_THRESHOLD,
    recoveryMaxAttempts: value.RECOVERY_MAX_ATTEMPTS,
    recoveryWindowMs: value.RECOVERY_WINDOW_MS,
    securityHmacSecret: value.SECURITY_HMAC_SECRET ?? value.SUPABASE_SECRET_KEY,
    storageSignedUrlRefreshSkewSeconds: value.STORAGE_SIGNED_URL_REFRESH_SKEW_SECONDS,
    storageSignedUrlTtlSeconds: value.STORAGE_SIGNED_URL_TTL_SECONDS,
    supabaseSecretKey: value.SUPABASE_SECRET_KEY,
    supabaseUrl: value.SUPABASE_URL,
    trustProxy: value.TRUST_PROXY,
    turnstileAllowedHostnames: parseAllowedHostnames(value.TURNSTILE_ALLOWED_HOSTNAMES),
    turnstileSecretKey: value.TURNSTILE_SECRET_KEY,
  }
}
