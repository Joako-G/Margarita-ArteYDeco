import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

import type { RequestHandler } from 'express'
import type { Logger } from 'pino'
import { pinoHttp } from 'pino-http'

export function safeRequestUrl(url: string | undefined): string | undefined {
  if (['/api/webhooks/mercado-pago', '/api/webhooks/mercado-pago/'].includes(url?.split('?')[0] ?? '')) {
    return '/api/webhooks/mercado-pago'
  }
  return url
}

export function createRequestLoggerMiddleware(logger: Logger): RequestHandler {
  return pinoHttp<IncomingMessage, ServerResponse>({
    genReqId: (_request, response) => {
      const requestId = randomUUID()
      response.setHeader('X-Request-Id', requestId)
      return requestId
    },
    logger,
    serializers: {
      req: (request: IncomingMessage) => ({
        id: request.id,
        method: request.method,
        remoteAddress: request.socket.remoteAddress,
        url: safeRequestUrl(request.url),
      }),
      res: (response: ServerResponse) => ({
        statusCode: response.statusCode,
      }),
    },
    wrapSerializers: false,
  })
}
