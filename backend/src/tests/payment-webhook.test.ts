import { createHmac } from 'node:crypto'

import express from 'express'
import type { Logger } from 'pino'
import pino from 'pino'
import requestAgent from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { loadMercadoPagoConfig } from '../payments/config.js'
import { verifyMercadoPagoWebhookSignature, WEBHOOK_REPLAY_WINDOW_MS } from '../payments/webhook-signature.js'
import { PaymentWebhookController } from '../controllers/payment-webhook.controller.js'
import { createErrorMiddleware } from '../middlewares/error.middleware.js'
import { createRequestLoggerMiddleware } from '../middlewares/request-logger.middleware.js'
import { PaymentInboxRepository } from '../repositories/payment-inbox.repository.js'
import { RepositoryError } from '../utils/app-error.js'
import { createPaymentWebhookRouter } from '../routes/payment-webhook.routes.js'
import { PaymentWebhookService } from '../services/payment-webhook.service.js'

const secret = 'webhook-secret-that-is-at-least-32-characters'
const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() } as unknown as Logger
const config = {
  ...loadMercadoPagoConfig({ NODE_ENV: 'development', MP_ENABLED: '0' }),
  webhookSecret: secret,
}

function signedHeaders(
  resourceId = 'order-123',
  timestamp = Math.floor(Date.now() / 1000),
  requestId = 'request-123',
): { requestId: string; signature: string } {
  const manifest = `id:${resourceId};request-id:${requestId};ts:${timestamp};`
  const signature = createHmac('sha256', secret).update(manifest).digest('hex')
  return { requestId, signature: `ts=${timestamp},v1=${signature}` }
}

function createService(): {
  acknowledge: ReturnType<typeof vi.fn>
  service: PaymentWebhookService
} {
  const acknowledge = vi.fn(async () => ({ duplicate: false }))
  const service = new PaymentWebhookService({ acknowledge }, config, logger)
  return { acknowledge, service }
}

describe('Mercado Pago Webhook inbox boundary', () => {
  it('validates the provider manifest and acknowledges after inbox persistence', async () => {
    const { acknowledge, service } = createService()
    const headers = signedHeaders()

    await expect(service.receive({
      body: Buffer.from(JSON.stringify({ type: 'order', data: { id: 'order-123' } })),
      requestId: headers.requestId,
      signature: headers.signature,
    })).resolves.toEqual({ duplicate: false })
    expect(acknowledge).toHaveBeenCalledWith(expect.objectContaining({
      environment: 'sandbox',
      requestId: headers.requestId,
      resourceId: 'order-123',
      resourceType: 'order',
      signatureDigest: expect.any(Buffer),
    }))
  })

  it('normalizes legacy merchant_order notifications from query id and resource URL', async () => {
    const { acknowledge, service } = createService()
    const headers = signedHeaders('merchant-order-123')

    await expect(service.receive({
      body: Buffer.from(JSON.stringify({ resource: 'https://api.mercadolibre.com/merchant_orders/merchant-order-123', topic: 'merchant_order' })),
      query: { id: 'merchant-order-123', topic: 'merchant_order' },
      requestId: headers.requestId,
      signature: headers.signature,
    })).resolves.toEqual({ duplicate: false })
    expect(acknowledge).toHaveBeenCalledWith(expect.objectContaining({
      resourceId: 'merchant-order-123',
      resourceType: 'merchant_order',
    }))
  })

  it('acknowledges a signed webhook with an empty body and a dotted query ID', async () => {
    const { acknowledge, service } = createService()
    const app = express()
    app.use(createPaymentWebhookRouter(new PaymentWebhookController(service), logger))
    const headers = signedHeaders('payment-123')

    await requestAgent(app).post('/?data.id=payment-123')
      .set('Content-Type', 'application/json')
      .set('x-request-id', headers.requestId)
      .set('x-signature', headers.signature)
      .send('{}').expect(200)
    expect(acknowledge).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 'payment-123' }))
  })

  it.each([
    ['legacy query ID', '/?data.id=payment-123&id=other-123', '{}', 'payment-123'],
    ['body ID', '/?data.id=payment-123', JSON.stringify({ data: { id: 'other-123' } }), 'other-123'],
    ['duplicate dotted IDs', '/?data.id=payment-123&data.id=other-123', '{}', 'payment-123'],
  ])('rejects conflicting %s without inbox effects', async (_name, url, body, signedId) => {
    const { acknowledge, service } = createService()
    const app = express()
    app.use(createPaymentWebhookRouter(new PaymentWebhookController(service), logger))
    const headers = signedHeaders(signedId)

    await requestAgent(app).post(url)
      .set('Content-Type', 'application/json')
      .set('x-request-id', headers.requestId)
      .set('x-signature', headers.signature)
      .send(body).expect(401)
    expect(acknowledge).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ reason_code: 'id_conflict' }), 'payment_webhook_signature_rejected')
  })

  it.each([
    ['id_conflict', { data: { id: 'order-123' } }, signedHeaders().signature, 'request-123', { 'data.id': 'other-private-id' }],
    ['missing_id', {}, signedHeaders().signature, 'request-123', undefined],
    ['missing_request_id', { data: { id: 'order-123' } }, signedHeaders().signature, undefined, undefined],
    ['malformed_signature', { data: { id: 'order-123' } }, 'private-malformed-signature', 'request-123', undefined],
    ['expired_timestamp', { data: { id: 'order-123' } }, signedHeaders('order-123', Math.floor(Date.now() / 1000) - 301).signature, 'request-123', undefined],
    ['hmac_mismatch', { data: { id: 'order-123' } }, signedHeaders('other-private-id').signature, 'request-123', undefined],
  ])('logs only the bounded %s reason for rejected signatures', async (reasonCode, payload, signature, requestId, query) => {
    const lines: string[] = []
    const log = pino({ level: 'info' }, { write: (line: string) => { lines.push(line) } })
    const acknowledge = vi.fn()
    const service = new PaymentWebhookService({ acknowledge }, config, log)

    await expect(service.receive({
      body: Buffer.from(JSON.stringify(payload)),
      requestId,
      signature,
      ...(query === undefined ? {} : { query }),
    })).rejects.toMatchObject({ code: 'INVALID_WEBHOOK', statusCode: 401 })

    expect(acknowledge).not.toHaveBeenCalled()
    expect(lines.map((line) => JSON.parse(line) as Record<string, unknown>)).toEqual([expect.objectContaining({
      msg: 'payment_webhook_signature_rejected',
      stage: 'signature',
      status: 'rejected',
      reason_code: reasonCode,
    })])
    expect(lines.join('')).not.toMatch(/order-123|other-private-id|request-123|private-malformed-signature|webhook-secret|v1=|x-signature|digest|manifest/)
  })

  it('maps a missing signature header to the existing malformed reason code', async () => {
    const { acknowledge, service } = createService()

    await expect(service.receive({
      body: Buffer.from(JSON.stringify({ data: { id: 'order-123' } })),
      requestId: 'request-123',
      signature: undefined,
    })).rejects.toMatchObject({ code: 'INVALID_WEBHOOK', statusCode: 401 })

    expect(acknowledge).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ reason_code: 'malformed_signature' }), 'payment_webhook_signature_rejected')
  })

  it('preserves the five-minute replay boundary and successful verification', () => {
    const timestamp = 1_800_000_000
    const headers = signedHeaders('order-123', timestamp)
    const input = {
      resourceId: 'order-123',
      requestId: headers.requestId,
      signature: headers.signature,
      secret,
    }

    expect(verifyMercadoPagoWebhookSignature({ ...input, nowMs: timestamp * 1000 + WEBHOOK_REPLAY_WINDOW_MS }))
      .toMatchObject({ valid: true, digest: expect.any(Buffer), timestamp })
    expect(verifyMercadoPagoWebhookSignature({ ...input, nowMs: timestamp * 1000 + WEBHOOK_REPLAY_WINDOW_MS + 1 }))
      .toEqual({ valid: false, reasonCode: 'expired_timestamp' })
    expect(verifyMercadoPagoWebhookSignature({ ...input, secret: null }))
      .toEqual({ valid: false, reasonCode: 'missing_secret' })
  })

  it('rejects an invalid signature for a dotted query ID and empty body', async () => {
    const { acknowledge, service } = createService()
    const app = express()
    app.use(createPaymentWebhookRouter(new PaymentWebhookController(service), logger))

    await requestAgent(app).post('/?data.id=payment-123')
      .set('Content-Type', 'application/json')
      .set('x-request-id', 'request-123')
      .set('x-signature', 'ts=1800000000,v1=bad')
      .send('{}').expect(401)
    expect(acknowledge).not.toHaveBeenCalled()
  })

  it('fails closed with a diagnostic when the webhook secret is unavailable', async () => {
    const service = new PaymentWebhookService({ acknowledge: vi.fn() }, { ...config, webhookSecret: null }, logger)
    await expect(service.receive({
      body: Buffer.from(JSON.stringify({ type: 'payment', data: { id: 'payment-1' } })),
      query: {},
      requestId: 'request-123',
      signature: undefined,
    })).rejects.toMatchObject({ code: 'PAYMENT_WEBHOOK_MISCONFIGURED', statusCode: 503 })
  })

  it.each([
    ['malformed payload', Buffer.from('{'), signedHeaders().signature],
    ['invalid signature', Buffer.from(JSON.stringify({ data: { id: 'order-123' } })), 'ts=1800000000,v1=bad'],
    ['stale signature', Buffer.from(JSON.stringify({ data: { id: 'order-123' } })), signedHeaders('order-123', Math.floor(Date.now() / 1000) - 301).signature],
  ])('rejects %s without inbox effects', async (_name, body, signature) => {
    const { acknowledge, service } = createService()

    await expect(service.receive({ body, requestId: 'request-123', signature })).rejects.toMatchObject({
      code: 'INVALID_WEBHOOK',
    })
    expect(acknowledge).not.toHaveBeenCalled()
  })

  it('returns duplicate acknowledgement and keeps out-of-order events in the inbox boundary', async (): Promise<void> => {
    const acknowledge = vi.fn()
      .mockResolvedValueOnce({ duplicate: false })
      .mockResolvedValueOnce({ duplicate: true })
    const service = new PaymentWebhookService({ acknowledge }, config, logger)
    const first = signedHeaders('order-123', undefined, 'request-123')
    const second = signedHeaders('order-123', undefined, 'request-456')
    const body = (status: string): Buffer => Buffer.from(JSON.stringify({ action: status, data: { id: 'order-123' } }))

    await expect(service.receive({ body: body('approved'), requestId: first.requestId, signature: first.signature }))
      .resolves.toEqual({ duplicate: false })
    await expect(service.receive({ body: body('pending'), requestId: second.requestId, signature: second.signature }))
      .resolves.toEqual({ duplicate: true })
    expect(acknowledge).toHaveBeenCalledTimes(2)
  })

  it('exposes only POST and bounds the raw request body', async () => {
    const { service } = createService()
    const app = express()
    app.use(createPaymentWebhookRouter(new PaymentWebhookController(service), logger))
    app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
      void _next
      const status = typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number(error.statusCode)
        : 500
      response.status(status).json({ error: 'handled' })
    })

    await requestAgent(app).get('/').expect(405)
    await requestAgent(app).post('/').set('Content-Type', 'application/json').send(Buffer.alloc(17 * 1024)).expect(413)
  })

  it('atomically enqueues one reconciliation job with the inbox acknowledgement', async () => {
    const rpc = vi.fn(async () => ({ data: false, error: null }))
    const repository = new PaymentInboxRepository({ rpc } as never)
    const signatureDigest = Buffer.from(Array.from({ length: 32 }, (_, index) => index))

    await expect(repository.acknowledge({
      environment: 'sandbox',
      requestId: 'request-123',
      resourceId: 'order-123',
      resourceType: 'order',
      signatureDigest,
    })).resolves.toEqual({ duplicate: false })
    expect(rpc).toHaveBeenCalledWith('acknowledge_payment_webhook_v2', expect.objectContaining({
      p_request_id: 'request-123',
      p_resource_id: 'order-123',
      p_signature_digest: '\\x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    }))
  })

  it('correlates arrival, signature validation, inbox success, and completion without sensitive values', async () => {
    const lines: string[] = []
    const log = pino({ level: 'info' }, { write: (line: string) => { lines.push(line) } })
    const acknowledge = vi.fn(async () => ({ duplicate: false }))
    const app = express()
    app.use(createRequestLoggerMiddleware(log))
    app.use('/api/webhooks/mercado-pago', createPaymentWebhookRouter(
      new PaymentWebhookController(new PaymentWebhookService({ acknowledge }, config, log)), log,
    ))
    app.use(createErrorMiddleware(log))
    const headers = signedHeaders('private-resource-id', undefined, 'private-provider-request-id')
    const response = await requestAgent(app)
      .post('/api/webhooks/mercado-pago?data.id=private-resource-id')
      .set('Content-Type', 'application/json')
      .set('x-request-id', headers.requestId)
      .set('x-signature', headers.signature)
      .send('{}')
      .expect(200)

    const events = lines.map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(events.map((event) => event.msg)).toEqual(expect.arrayContaining([
      'payment_webhook_received', 'payment_webhook_signature_verified',
      'payment_webhook_inbox_succeeded', 'payment_webhook_completed',
    ]))
    expect(events.filter((event) => String(event.msg).startsWith('payment_webhook_'))
      .every((event) => event.correlationId === response.headers['x-request-id'])).toBe(true)
    expect(events.find((event) => event.msg === 'payment_webhook_completed'))
      .toMatchObject({ stage: 'response', status: 200, durationMs: expect.any(Number) })
    expect(lines.join('')).not.toMatch(/private-resource-id|private-provider-request-id|webhook-secret|x-signature|v1=/)
  })

  it('logs signature rejection and inbox failure safely without changing their responses', async () => {
    const lines: string[] = []
    const log = pino({ level: 'info' }, { write: (line: string) => { lines.push(line) } })
    const acknowledge = vi.fn().mockRejectedValue(new RepositoryError('private-db-error webhook-secret private-resource-id'))
    const app = express()
    app.use(createRequestLoggerMiddleware(log))
    app.use('/api/webhooks/mercado-pago', createPaymentWebhookRouter(
      new PaymentWebhookController(new PaymentWebhookService({ acknowledge }, config, log)), log,
    ))
    app.use(createErrorMiddleware(log))
    const body = JSON.stringify({ data: { id: 'private-resource-id' } })
    await requestAgent(app).post('/api/webhooks/mercado-pago?id=private-resource-id')
      .set('Content-Type', 'application/json').set('x-request-id', 'private-provider-request-id')
      .set('x-signature', 'ts=1800000000,v1=private-signature').send(body).expect(401)
    const headers = signedHeaders('private-resource-id', undefined, 'private-provider-request-id')
    await requestAgent(app).post('/api/webhooks/mercado-pago?id=private-resource-id')
      .set('Content-Type', 'application/json').set('x-request-id', headers.requestId)
      .set('x-signature', headers.signature).send(body).expect(503)

    const events = lines.map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(events.map((event) => event.msg)).toEqual(expect.arrayContaining([
      'payment_webhook_signature_rejected', 'payment_webhook_inbox_failed',
    ]))
    expect(events.find((event) => event.msg === 'payment_webhook_signature_rejected'))
      .toMatchObject({ reason_code: 'malformed_signature' })
    expect(events.filter((event) => event.msg === 'payment_webhook_completed').map((event) => event.status))
      .toEqual([401, 503])
    expect(events.find((event) => event.msg === 'payment_webhook_inbox_failed'))
      .toMatchObject({ stage: 'inbox_rpc', status: 'failed' })
    expect(lines.join('')).not.toMatch(/private-resource-id|private-provider-request-id|private-signature|private-db-error|webhook-secret|x-signature/)
  })

  it('reports a bounded body rejection before signature validation', async () => {
    const lines: string[] = []
    const log = pino({ level: 'info' }, { write: (line: string) => { lines.push(line) } })
    const app = express()
    app.use(createRequestLoggerMiddleware(log))
    app.use('/api/webhooks/mercado-pago', createPaymentWebhookRouter(
      new PaymentWebhookController(createService().service), log,
    ))
    app.use(createErrorMiddleware(log))
    await requestAgent(app).post('/api/webhooks/mercado-pago/?id=private-resource-id')
      .set('Content-Type', 'application/json').send(Buffer.alloc(17 * 1024)).expect(413)
    const events = lines.map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(events.map((event) => event.msg)).toEqual(expect.arrayContaining([
      'payment_webhook_received', 'payment_webhook_completed',
    ]))
    expect(events.find((event) => event.msg === 'payment_webhook_completed'))
      .toMatchObject({ stage: 'response', status: 413 })
    expect(events.some((event) => event.msg === 'payment_webhook_signature_verified')).toBe(false)
    expect(lines.join('')).not.toContain('private-resource-id')
  })
})
