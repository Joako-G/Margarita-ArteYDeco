import { describe, expect, it } from 'vitest'

import { loadEnv } from '../config/env.js'

const BASE_ENV = {
  NODE_ENV: 'development',
  SECURITY_HMAC_SECRET: 'test-only-hmac-secret-at-least-32-characters',
  SUPABASE_SECRET_KEY: 'test-only-server-key-not-for-production',
  SUPABASE_URL: 'https://test-project.supabase.co',
  TURNSTILE_ALLOWED_HOSTNAMES: 'localhost,Margarita.Example,localhost',
  TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
} satisfies NodeJS.ProcessEnv

describe('loadEnv', () => {
  it('normalizes and deduplicates Turnstile hostnames', () => {
    const env = loadEnv(BASE_ENV)

    expect(env.turnstileAllowedHostnames).toEqual(['localhost', 'margarita.example'])
    expect(env.turnstileSecretKey).toBe('test-turnstile-secret')
  })

  it('requires the Turnstile secret in every environment', () => {
    const { TURNSTILE_SECRET_KEY: _secret, ...withoutSecret } = BASE_ENV
    void _secret

    expect(() => loadEnv(withoutSecret)).toThrow()
  })

  it('allows production to start without Redis', () => {
    const env = loadEnv({
      ...BASE_ENV,
      NODE_ENV: 'production',
    })

    expect(env.redisUrl).toBeNull()
  })

  it('accepts a configured Redis URL', () => {
    const env = loadEnv({ ...BASE_ENV, REDIS_URL: 'rediss://redis.example:6380' })

    expect(env.redisUrl).toBe('rediss://redis.example:6380')
  })

  it('does not use the Supabase key as the HMAC secret', () => {
    const { SECURITY_HMAC_SECRET: _secret, ...withoutHmacSecret } = BASE_ENV
    void _secret

    expect(() => loadEnv(withoutHmacSecret)).toThrow()
  })

  it('rejects Turnstile hostnames with a scheme or port', () => {
    expect(() => loadEnv({
      ...BASE_ENV,
      TURNSTILE_ALLOWED_HOSTNAMES: 'https://localhost:5173',
    })).toThrow()
  })

  it('parses an explicit list of trusted proxy IPs', () => {
    const env = loadEnv({
      ...BASE_ENV,
      TRUSTED_PROXY_IPS: '10.0.0.1, 10.0.0.1, 10.0.0.2',
    })

    expect(env.trustedProxyIps).toEqual(['10.0.0.1', '10.0.0.2'])
  })

  it('detects the Vercel runtime flag', () => {
    expect(loadEnv({ ...BASE_ENV, VERCEL: '1' }).isVercel).toBe(true)
  })
})
