import pino, { type Logger } from 'pino'

import type { IEnv } from './env.js'

export function createLogger(env: Pick<IEnv, 'nodeEnv'>): Logger {
  return pino({
    enabled: env.nodeEnv !== 'test',
    level: env.nodeEnv === 'production' ? 'info' : 'debug',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers.set-cookie',
        'authorization',
        'cookie',
        'token',
        'turnstileToken',
        'req.body.turnstileToken',
        'secretKey',
        'phone',
        'transferAlias',
        'transferCbu',
      ],
      censor: '[REDACTED]',
    },
  })
}
