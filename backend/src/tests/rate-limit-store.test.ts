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

  it('rejects immediately while Redis is offline and bounds reconnect attempts', async () => {
    createRateLimitStore('rediss://default:secret@redis.example:6379', 'cold-start-test')

    expect(redisMocks.constructor).toHaveBeenCalledWith(
      'rediss://default:secret@redis.example:6379',
      expect.objectContaining({
        commandTimeout: 1_000,
        connectTimeout: 5_000,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: expect.any(Function),
      }),
    )

    const options = redisMocks.constructor.mock.calls[0]?.[1] as {
      retryStrategy: (times: number) => number | null
    }
    expect(options.retryStrategy(1)).toBe(100)
    expect(options.retryStrategy(3)).toBeNull()

    const storeOptions = redisMocks.storeConstructor.mock.calls[0]?.[0] as {
      sendCommand: (...args: string[]) => Promise<unknown>
    }
    await storeOptions.sendCommand('SCRIPT', 'LOAD', 'return 1')

    expect(redisMocks.call).toHaveBeenCalledWith('SCRIPT', 'LOAD', 'return 1')
  })
})
