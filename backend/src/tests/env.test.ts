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

  it('rejects Turnstile hostnames with a scheme or port', () => {
    expect(() => loadEnv({
      ...BASE_ENV,
      TURNSTILE_ALLOWED_HOSTNAMES: 'https://localhost:5173',
    })).toThrow()
  })
})
