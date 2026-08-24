import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMocks = vi.hoisted(() => ({
  call: vi.fn().mockResolvedValue(null),
  constructor: vi.fn(),
  storeConstructor: vi.fn(),
}))

vi.mock('ioredis', () => ({
  Redis: class RedisMock {
    public readonly call = redisMocks.call

    public constructor(redisUrl: string, options: Readonly<Record<string, unknown>>) {
      redisMocks.constructor(redisUrl, options)
    }
  },
}))

vi.mock('rate-limit-redis', () => ({
  RedisStore: class RedisStoreMock {
    public constructor(options: Readonly<Record<string, unknown>>) {
      redisMocks.storeConstructor(options)
    }
  },
}))

import { createRateLimitStore } from '../config/rate-limit-store.js'

describe('rate limit Redis store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queues initialization commands until the serverless Redis connection is ready', async () => {
    createRateLimitStore('rediss://default:secret@redis.example:6379', 'cold-start-test')

    expect(redisMocks.constructor).toHaveBeenCalledWith(
      'rediss://default:secret@redis.example:6379',
      expect.objectContaining({
        connectTimeout: 5_000,
        enableOfflineQueue: true,
        maxRetriesPerRequest: 1,
      }),
    )

    const storeOptions = redisMocks.storeConstructor.mock.calls[0]?.[0] as {
      sendCommand: (...args: string[]) => Promise<unknown>
    }
    await storeOptions.sendCommand('SCRIPT', 'LOAD', 'return 1')

    expect(redisMocks.call).toHaveBeenCalledWith('SCRIPT', 'LOAD', 'return 1')
  })
})
