import type { Store } from 'express-rate-limit'
import { Redis } from 'ioredis'
import { RedisStore, type RedisReply } from 'rate-limit-redis'

const clients = new Map<string, InstanceType<typeof Redis>>()
let localStoreWarningEmitted = false

export function createRateLimitStore(
  redisUrl: string | null,
  prefix: string,
): Store | undefined {
  if (redisUrl === null) {
    if (!localStoreWarningEmitted) {
      process.emitWarning(
        'REDIS_URL no está configurada; el rate limiting será local y no distribuido',
        { code: 'RATE_LIMIT_LOCAL_STORE' },
      )
      localStoreWarningEmitted = true
    }

    return undefined
  }

  let client = clients.get(redisUrl)

  if (client === undefined) {
    client = new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    })
    clients.set(redisUrl, client)
  }

  return new RedisStore({
    prefix: `margarita:${prefix}:`,
    sendCommand: async (...args: string[]): Promise<RedisReply> => {
      const [command, ...commandArgs] = args
      const result: unknown = await client.call(command!, ...commandArgs)
      return result as RedisReply
    },
  })
}
