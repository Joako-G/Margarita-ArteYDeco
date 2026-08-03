import type { AxiosInstance } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { createLogger } from '../config/logger.js'
import { TurnstileService } from '../services/turnstile.service.js'

const SECRET = 'test-turnstile-secret'
const IP_ADDRESS = '203.0.113.7'
const TOKEN = 'test-turnstile-token'

function createClient(response: unknown): AxiosInstance {
  return {
    post: vi.fn().mockResolvedValue({ data: response }),
  } as unknown as AxiosInstance
}

function createService(client: AxiosInstance): TurnstileService {
  return new TurnstileService(
    SECRET,
    ['localhost', 'margarita.example'],
    createLogger({ nodeEnv: 'test' }),
    client,
  )
}

describe('TurnstileService', () => {
  it('accepts a successful challenge only for the expected action and hostname', async () => {
    const client = createClient({
      action: 'order_recovery',
      hostname: 'localhost',
      success: true,
    })
    const service = createService(client)

    await expect(service.verify({ ipAddress: IP_ADDRESS, token: TOKEN })).resolves.toBe('valid')
    expect(client.post).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        remoteip: IP_ADDRESS,
        response: TOKEN,
        secret: SECRET,
      }),
    )
  })

  it('rejects a valid token issued for another action or hostname', async () => {
    const wrongAction = createService(createClient({
      action: 'login',
      hostname: 'localhost',
      success: true,
    }))
    const wrongHostname = createService(createClient({
      action: 'order_recovery',
      hostname: 'attacker.example',
      success: true,
    }))

    await expect(wrongAction.verify({ ipAddress: IP_ADDRESS, token: TOKEN }))
      .resolves.toBe('invalid')
    await expect(wrongHostname.verify({ ipAddress: IP_ADDRESS, token: TOKEN }))
      .resolves.toBe('invalid')
  })

  it('classifies a rejected or replayed challenge as invalid', async () => {
    const service = createService(createClient({
      'error-codes': ['timeout-or-duplicate'],
      success: false,
    }))

    await expect(service.verify({ ipAddress: IP_ADDRESS, token: TOKEN }))
      .resolves.toBe('invalid')
  })

  it('fails closed without penalizing the user when Cloudflare reports an internal error', async () => {
    const service = createService(createClient({
      'error-codes': ['internal-error'],
      success: false,
    }))

    await expect(service.verify({ ipAddress: IP_ADDRESS, token: TOKEN }))
      .resolves.toBe('unavailable')
  })

  it('rejects malformed provider responses as unavailable', async () => {
    const service = createService(createClient({ unexpected: true }))

    await expect(service.verify({ ipAddress: IP_ADDRESS, token: TOKEN }))
      .resolves.toBe('unavailable')
  })
})
