import type { Logger } from 'pino'
import type { ErrorRequestHandler } from 'express'
import express from 'express'
import requestAgent from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { loadMercadoPagoConfig } from '../payments/config.js'
import { PaymentCheckoutController } from '../controllers/payment-checkout.controller.js'
import type { PaymentProvider } from '../payments/types.js'
import { PaymentCheckoutRepository } from '../repositories/payment-checkout.repository.js'
import { paymentCheckoutBodySchema } from '../schemas/payment-checkout.schema.js'
import { createPaymentCheckoutRouter } from '../routes/payment-checkout.routes.js'
import { PaymentCheckoutService } from '../services/payment-checkout.service.js'
import { AppError } from '../utils/app-error.js'
import { GUEST_SESSION_COOKIE_NAME } from '../utils/cookies.js'

const request = {
  customer: { firstName: 'Ana', lastName: 'Lopez', notes: '', phone: '1123456789' },
  deliveryMethod: 'pickup' as const,
  items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
  paymentMethod: 'mercado_pago' as const,
  shippingAddress: '',
}

const sessionService = {
  getOrCreate: vi.fn(async () => ({
    expiresAt: new Date('2026-09-18T17:00:00.000Z'),
    id: '00000000-0000-4000-8000-000000000002',
    tokenToSet: 'session-token',
  })),
} as never

const logger = { error: vi.fn(), warn: vi.fn() } as unknown as Logger

const enabledConfig = {
  ...loadMercadoPagoConfig({ NODE_ENV: 'development', MP_ENABLED: '0' }),
  enabled: true,
  failureUrl: 'https://shop.example.test/pedido/{orderNumber}/pago',
  pendingUrl: 'https://shop.example.test/pedido/{orderNumber}/pago',
  successUrl: 'https://shop.example.test/pedido/{orderNumber}/pago',
}

describe('Mercado Pago checkout API boundary', () => {
  it.each([
    ['23505', 409, 'IDEMPOTENCY_CONFLICT'],
    ['P0001', 409, 'PRODUCT_UNAVAILABLE'],
    ['23514', 400, 'INVALID_ORDER'],
    ['22023', 400, 'VALIDATION_ERROR'],
  ] as const)('maps RPC error %s to a safe public error', async (code, statusCode, publicCode) => {
    const rpcError = { code, message: 'raw database message with customer phone 1123456789 and secret token' }
    const repository = new PaymentCheckoutRepository({ rpc: vi.fn().mockResolvedValue({ data: null, error: rpcError }) } as never, logger)

    await expect(repository.initialize('session-id', {})).rejects.toMatchObject({ statusCode, code: publicCode })
    await expect(repository.initialize('session-id', {})).rejects.not.toThrow(rpcError.message)
  })

  it('keeps unknown RPC failures unavailable and logs only safe diagnostics', async () => {
    const rpcError = { code: 'XX000', message: 'provider secret token=abc customer phone 1123456789' }
    const repository = new PaymentCheckoutRepository({ rpc: vi.fn().mockResolvedValue({ data: null, error: rpcError }) } as never, logger)

    await expect(repository.initialize('session-id', {})).rejects.toMatchObject({ statusCode: 503, code: 'DATA_SOURCE_UNAVAILABLE' })
    expect(logger.error).toHaveBeenCalledWith({ code: 'XX000', operation: 'create_order_with_payment_v2' }, expect.any(String))
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(rpcError.message)
  })

  it('logs safe diagnostics when provider failure persistence fails', async () => {
    const databaseError = { code: '42501', message: 'permission denied for customer phone 1123456789 token=secret' }
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: databaseError }) })
    const repository = new PaymentCheckoutRepository({ from: vi.fn().mockReturnValue({ update }) } as never, logger)

    await expect(repository.recordProviderFailure('attempt-1', 'Provider order creation failed'))
      .rejects.toMatchObject({ code: 'DATA_SOURCE_UNAVAILABLE' })
    expect(logger.error).toHaveBeenCalledWith({ code: '42501', operation: 'record_provider_failure' }, expect.any(String))
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(databaseError.message)
  })

  it('logs safe diagnostics when provider order persistence fails', async () => {
    const databaseError = { code: '42501', message: 'permission denied for customer phone 1123456789 token=secret' }
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: databaseError }) })
    const repository = new PaymentCheckoutRepository({ from: vi.fn().mockReturnValue({ update }) } as never, logger)

    await expect(repository.recordProviderPreference('attempt-1', 'provider-key', {
      checkoutUrl: 'https://checkout.test',
      providerPreferenceId: 'provider-preference-1',
      providerStatus: 'created',
    })).rejects.toMatchObject({ code: 'DATA_SOURCE_UNAVAILABLE' })
    expect(logger.error).toHaveBeenCalledWith({ code: '42501', operation: 'record_provider_preference' }, expect.any(String))
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(databaseError.message)
  })

  it('logs safe diagnostics when the payment snapshot query fails', async () => {
    const databaseError = { code: '42501', message: 'permission denied for customer phone 1123456789 token=secret' }
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: databaseError })
    const query = { eq: vi.fn().mockReturnValue({ maybeSingle }) }
    const repository = new PaymentCheckoutRepository({ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(query) }) } as never, logger)

    await expect(repository.findSnapshot('attempt-1')).rejects.toMatchObject({
      code: 'DATA_SOURCE_UNAVAILABLE',
      statusCode: 503,
    })
    expect(logger.error).toHaveBeenCalledWith({ code: '42501', operation: 'find_payment_snapshot' }, expect.any(String))
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(databaseError.message)
  })

  it('logs an empty result diagnostic without identifiers', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const query = { eq: vi.fn().mockReturnValue({ maybeSingle }) }
    const repository = new PaymentCheckoutRepository({ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(query) }) } as never, logger)

    await expect(repository.findSnapshot('attempt-1')).rejects.toMatchObject({ code: 'DATA_SOURCE_UNAVAILABLE' })
    expect(logger.warn).toHaveBeenCalledWith(
      { diagnostic: 'empty_result', operation: 'find_payment_snapshot' },
      expect.any(String),
    )
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain('attempt-1')
  })

  it('logs a fixed diagnostic when the payment snapshot shape is invalid', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'attempt-1', customer_phone: '1123456789' }, error: null })
    const query = { eq: vi.fn().mockReturnValue({ maybeSingle }) }
    const repository = new PaymentCheckoutRepository({ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(query) }) } as never, logger)

    await expect(repository.findSnapshot('attempt-1')).rejects.toMatchObject({ code: 'DATA_SOURCE_UNAVAILABLE' })
    expect(logger.error).toHaveBeenCalledWith(
      { diagnostic: 'invalid_snapshot_shape', operation: 'find_payment_snapshot' },
      expect.any(String),
    )
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain('1123456789')
  })

  it('requests order items through orders and maps the nested snapshot', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        amount: '2500',
        attempt_id: '00000000-0000-4000-8000-000000000003',
        external_reference: 'order-reference',
        id: '00000000-0000-4000-8000-000000000004',
        order_id: '00000000-0000-4000-8000-000000000005',
        orders: {
          order_items: [{ product_name: 'Paint set', quantity: '2', unit_price: '1250' }],
          order_number: 'MAD-1',
        },
        reservation_expires_at: '2026-09-18T17:00:00.000Z',
      },
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    const repository = new PaymentCheckoutRepository({ from: vi.fn().mockReturnValue({ select }) } as never, logger)

    await expect(repository.findSnapshot('00000000-0000-4000-8000-000000000004')).resolves.toEqual({
      amount: 2500,
      attemptId: '00000000-0000-4000-8000-000000000004',
      items: [{ currency: 'ARS', quantity: 2, title: 'Paint set', unitPrice: 1250 }],
      orderId: '00000000-0000-4000-8000-000000000005',
      orderNumber: 'MAD-1',
    })
    expect(select).toHaveBeenCalledWith(
      'id, order_id, amount, external_reference, reservation_expires_at, orders(order_number, order_items(product_name, quantity, unit_price))',
    )
    expect(select.mock.calls[0]?.[0]).not.toMatch(/reservation_expires_at,\s*order_items\(/)
  })

  it.each([
    ['rejected', '2099-09-18T17:00:00.000Z', true],
    ['approved', '2099-09-18T17:00:00.000Z', false],
    ['rejected', '2020-09-18T17:00:00.000Z', false],
  ] as const)('keeps only an active pending or rejected attempt resumable (%s, %s)', async (status, reservationExpiresAt, resumable) => {
    const row = {
      order_id: 'order-1',
      provider_payment_id: 'rejected-provider-payment',
      provider_preference_id: 'provider-preference-1',
      reservation_expires_at: reservationExpiresAt,
      status,
    }
    let matches = true
    const maybeSingle = vi.fn(async () => ({ data: matches ? row : null, error: null }))
    const query = {
      eq: vi.fn((field: string, value: unknown) => {
        matches = matches && row[field as keyof typeof row] === value
        return query
      }),
      gt: vi.fn((field: string, value: string) => {
        matches = matches && new Date(row[field as keyof typeof row]).getTime() > new Date(value).getTime()
        return query
      }),
      in: vi.fn((field: string, values: readonly unknown[]) => {
        matches = matches && values.includes(row[field as keyof typeof row])
        return query
      }),
      limit: vi.fn(() => query),
      maybeSingle,
      not: vi.fn((field: string, _operator: string, value: unknown) => {
        matches = matches && row[field as keyof typeof row] !== value
        return query
      }),
      order: vi.fn(() => query),
    }
    const repository = new PaymentCheckoutRepository({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(query) }),
    } as never, logger)

    await expect(repository.findResumableAttempt('order-1', new Date('2026-09-18T16:00:00.000Z'))).resolves.toEqual(
      resumable
        ? {
            providerPreferenceId: 'provider-preference-1',
            reservationExpiresAt: new Date(reservationExpiresAt),
            status,
          }
        : null,
    )
    expect(maybeSingle).toHaveBeenCalledOnce()
  })

  it('rejects shipping without an address at the schema boundary', () => {
    const result = paymentCheckoutBodySchema.safeParse({ ...request, deliveryMethod: 'shipping' })
    expect(result.success).toBe(false)
  })

  it('accepts Mercado Pago without accepting a hosted-checkout payment type', () => {
    expect(paymentCheckoutBodySchema.safeParse(request).success).toBe(true)
    expect(paymentCheckoutBodySchema.safeParse({ ...request, paymentMethod: 'debit_card' }).success).toBe(false)
    expect(paymentCheckoutBodySchema.safeParse({ ...request, mercadoPagoMethod: 'debit_card' }).success).toBe(false)
  })

  it('fails closed before initializing an order when disabled', async () => {
    const repository = { initialize: vi.fn() }
    const service = new PaymentCheckoutService(
      repository as never,
      sessionService,
      null,
      loadMercadoPagoConfig({ NODE_ENV: 'development', MP_ENABLED: '0' }),
      logger,
    )

    await expect(service.create(request, null, 'checkout-key-123456')).rejects.toMatchObject({
      code: 'PAYMENT_METHOD_DISABLED',
    })
    expect(repository.initialize).not.toHaveBeenCalled()
  })

  it('resumes the authorized active preference without initializing another order', async () => {
    const provider: PaymentProvider = {
      createPreference: vi.fn(),
      getPreferenceCheckoutUrl: vi.fn(async () => 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=existing'),
      getPayment: vi.fn(),
    }
    const repository = {
      initialize: vi.fn(),
      findResumableAttempt: vi.fn(async () => ({
        providerPreferenceId: 'existing-preference',
        reservationExpiresAt: new Date('2026-09-18T16:40:00.000Z'),
        status: 'pending' as const,
      })),
      findSnapshot: vi.fn(),
    }
    const publicOrders = { authorizeOrder: vi.fn(async () => ({ orderId: 'order-1' })) }
    const service = new PaymentCheckoutService(repository as never, sessionService, provider, enabledConfig, logger, publicOrders as never)

    await expect(service.resume('MAD-20260918-000001', 'guest-session')).resolves.toEqual({
      checkoutUrl: 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=existing',
      orderNumber: 'MAD-20260918-000001',
      reservationExpiresAt: new Date('2026-09-18T16:40:00.000Z'),
    })
    expect(publicOrders.authorizeOrder).toHaveBeenCalledWith('MAD-20260918-000001', 'guest-session')
    expect(repository.initialize).not.toHaveBeenCalled()
    expect(repository.findSnapshot).not.toHaveBeenCalled()
  })

  it('resumes the same preference after a provider rejection without creating another local attempt', async () => {
    const provider: PaymentProvider = {
      createPreference: vi.fn(),
      getPreferenceCheckoutUrl: vi.fn(async () => 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=retry'),
      getPayment: vi.fn(),
    }
    const repository = {
      initialize: vi.fn(),
      findResumableAttempt: vi.fn(async () => ({
        providerPreferenceId: 'same-preference',
        reservationExpiresAt: new Date('2099-09-18T16:40:00.000Z'),
        status: 'rejected' as const,
      })),
      findSnapshot: vi.fn(),
    }
    const publicOrders = { authorizeOrder: vi.fn(async () => ({ orderId: 'order-1' })) }
    const service = new PaymentCheckoutService(repository as never, sessionService, provider, enabledConfig, logger, publicOrders as never)

    await expect(service.resume('MAD-20260918-000001', 'guest-session')).resolves.toMatchObject({
      checkoutUrl: 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=retry',
    })
    expect(provider.getPreferenceCheckoutUrl).toHaveBeenCalledWith('same-preference')
    expect(repository.initialize).not.toHaveBeenCalled()
    expect(repository.findSnapshot).not.toHaveBeenCalled()
  })

  it('fails safely when the reservation has no resumable preference', async () => {
    const provider = { getPreferenceCheckoutUrl: vi.fn() } as unknown as PaymentProvider
    const repository = {
      findResumableAttempt: vi.fn(async () => null),
    }
    const publicOrders = { authorizeOrder: vi.fn(async () => ({ orderId: 'order-1' })) }
    const service = new PaymentCheckoutService(repository as never, sessionService, provider, enabledConfig, logger, publicOrders as never)

    await expect(service.resume('MAD-20260918-000001', 'guest-session')).rejects.toMatchObject({
      code: 'PAYMENT_NOT_READY',
      statusCode: 409,
    })
    expect(provider.getPreferenceCheckoutUrl).not.toHaveBeenCalled()
  })

  it.each([
    ['approved', 'approved', 'view_order'],
    ['pending', 'pending', 'refresh'],
    ['rejected', 'rejected', 'refresh'],
    ['expired', 'expired', 'recover'],
    ['cancelled', 'expired', 'recover'],
    ['manual_review', 'manual-review', 'contact_support'],
  ] as const)('returns the authoritative public status for %s', async (attemptStatus, expectedStatus, nextAction) => {
    const repository = {
      findLatestAttempt: vi.fn(async () => ({
        reservationExpiresAt: new Date('2099-09-18T16:40:00.000Z'),
        status: attemptStatus,
      })),
    }
    const publicOrders = { authorizeOrder: vi.fn(async () => ({ orderId: 'order-1' })) }
    const service = new PaymentCheckoutService(
      repository as never,
      sessionService,
      null,
      enabledConfig,
      logger,
      publicOrders as never,
    )

    await expect(service.getStatus('MAD-20260918-000001', 'guest-session')).resolves.toMatchObject({
      nextAction,
      orderNumber: 'MAD-20260918-000001',
      status: expectedStatus,
    })
    expect(publicOrders.authorizeOrder).toHaveBeenCalledWith('MAD-20260918-000001', 'guest-session')
  })

  it('expires a pending status after the server-side reservation deadline', async () => {
    const repository = {
      findLatestAttempt: vi.fn(async () => ({
        reservationExpiresAt: new Date('2020-09-18T16:40:00.000Z'),
        status: 'pending' as const,
      })),
    }
    const publicOrders = { authorizeOrder: vi.fn(async () => ({ orderId: 'order-1' })) }
    const service = new PaymentCheckoutService(
      repository as never,
      sessionService,
      null,
      enabledConfig,
      logger,
      publicOrders as never,
    )

    await expect(service.getStatus('MAD-20260918-000001', 'guest-session')).resolves.toMatchObject({
      nextAction: 'recover',
      status: 'expired',
    })
  })

  it('exposes only the public status projection and ignores redirect query values', async () => {
    const serviceGetStatus = vi.fn(async () => ({
      nextAction: 'view_order' as const,
      orderNumber: 'MAD-20260918-000001',
      reservationExpiresAt: new Date('2099-09-18T16:40:00.000Z'),
      status: 'approved' as const,
    }))
    const app = express()
    app.use('/checkout', createPaymentCheckoutRouter({
      csrfService: { verifyToken: () => true } as never,
      paymentCheckoutController: new PaymentCheckoutController({
        create: vi.fn(),
        getStatus: serviceGetStatus,
        resume: vi.fn(),
      }),
    }, { corsAllowedOrigins: ['http://localhost:5173'] }))

    const response = await requestAgent(app)
      .get('/checkout/MAD-20260918-000001/status?status=rejected&payment_id=secret')
      .set('Cookie', `${GUEST_SESSION_COOKIE_NAME}=guest-session`)
      .expect(200)

    expect(serviceGetStatus).toHaveBeenCalledWith('MAD-20260918-000001', 'guest-session')
    expect(response.body.data).toEqual({
      nextAction: 'view_order',
      orderNumber: 'MAD-20260918-000001',
      reservationExpiresAt: '2099-09-18T16:40:00.000Z',
      status: 'approved',
    })
    expect(JSON.stringify(response.body)).not.toContain('secret')
  })

  it('does not expose provider identifiers in the resume route response', async () => {
    const serviceResume = vi.fn(async () => ({
      checkoutUrl: 'https://checkout.test',
      orderNumber: 'MAD-20260918-000001',
      reservationExpiresAt: new Date('2026-09-18T16:40:00.000Z'),
    }))
    const app = express()
    app.use('/checkout', createPaymentCheckoutRouter({
      csrfService: { verifyToken: () => true } as never,
      paymentCheckoutController: new PaymentCheckoutController({ create: vi.fn(), resume: serviceResume, getStatus: vi.fn() }),
    }, { corsAllowedOrigins: ['http://localhost:5173'] }))

    const response = await requestAgent(app)
      .get('/checkout/MAD-20260918-000001')
      .set('Cookie', `${GUEST_SESSION_COOKIE_NAME}=guest-session`)
      .expect(200)

    expect(response.body.data).toEqual({
      checkoutUrl: 'https://checkout.test',
      orderNumber: 'MAD-20260918-000001',
      reservationExpiresAt: '2026-09-18T16:40:00.000Z',
    })
    expect(JSON.stringify(response.body)).not.toContain('provider')
  })

  it('returns only the hosted checkout projection after provider creation', async () => {
    const provider: PaymentProvider = {
       createPreference: vi.fn(async () => ({
         checkoutUrl: 'https://www.mercadopago.com/checkout/v1/redirect?token=safe',
         providerPreferenceId: 'provider-preference-1',
         providerStatus: 'created',
       })),
       getPayment: vi.fn(),
    }
    const repository = {
      initialize: vi.fn(async () => ({
        attemptId: '00000000-0000-4000-8000-000000000003',
        orderId: '00000000-0000-4000-8000-000000000004',
        reservationExpiresAt: new Date('2026-09-18T16:40:00.000Z'),
      })),
      findSnapshot: vi.fn(async () => ({
        amount: 1250,
        attemptId: '00000000-0000-4000-8000-000000000003',
        items: [{ currency: 'ARS' as const, quantity: 1, title: 'Paint set', unitPrice: 1250 }],
        orderId: '00000000-0000-4000-8000-000000000004',
        orderNumber: 'MAD-20260918-000001',
      })),
      recordProviderFailure: vi.fn(),
       recordProviderPreference: vi.fn(),
    }
    const service = new PaymentCheckoutService(
      repository,
      sessionService,
      provider,
      enabledConfig,
      logger,
    )

    const result = await service.create(request, null, 'checkout-key-123456')
    expect(result).toEqual({
      checkoutUrl: 'https://www.mercadopago.com/checkout/v1/redirect?token=safe',
      orderNumber: 'MAD-20260918-000001',
      reservationExpiresAt: new Date('2026-09-18T16:40:00.000Z'),
      sessionExpiresAt: new Date('2026-09-18T17:00:00.000Z'),
      sessionTokenToSet: 'session-token',
    })
     expect(repository.recordProviderPreference).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000003',
       expect.stringContaining('margarita:mercado-pago:create_preference:'),
       expect.objectContaining({ providerPreferenceId: 'provider-preference-1' }),
    )
  })

  it('expands the configured order placeholder in every return URL', async () => {
    const provider: PaymentProvider = {
       createPreference: vi.fn(async () => ({ checkoutUrl: 'https://checkout.test', providerPreferenceId: 'provider-preference-1', providerStatus: 'created' })),
       getPayment: vi.fn(),
    }
    const repository = {
      initialize: vi.fn(async () => ({ attemptId: 'attempt-1', orderId: 'order-1', reservationExpiresAt: new Date('2026-09-18T16:40:00.000Z') })),
       findSnapshot: vi.fn(async () => ({ amount: 1250, attemptId: 'attempt-1', items: [], orderId: 'order-1', orderNumber: 'MAD/20260918 000001' })),
      recordProviderFailure: vi.fn(),
       recordProviderPreference: vi.fn(),
    }
    const service = new PaymentCheckoutService(repository, sessionService, provider, {
      ...enabledConfig,
      failureUrl: 'https://shop.example.test/pedido/{orderNumber}/pago',
      pendingUrl: 'https://shop.example.test/pedido/{orderNumber}/pago?state=pending',
      successUrl: 'https://shop.example.test/pedido/{orderNumber}/pago?state=success',
    }, logger)

    await service.create(request, null, 'checkout-key-123456')

     expect(provider.createPreference).toHaveBeenCalledWith(expect.objectContaining({
      backUrls: {
        failure: 'https://shop.example.test/pedido/MAD%2F20260918%20000001/pago',
        pending: 'https://shop.example.test/pedido/MAD%2F20260918%20000001/pago?state=pending',
        success: 'https://shop.example.test/pedido/MAD%2F20260918%20000001/pago?state=success',
      },
    }))
     const payload = vi.mocked(provider.createPreference).mock.calls[0]![0]
    expect(JSON.stringify(payload)).not.toContain('{orderNumber}')
  })

  it('sends the product total without shipping or provider surcharge', async () => {
    const provider: PaymentProvider = {
       createPreference: vi.fn(async () => ({ checkoutUrl: 'https://checkout.test', providerPreferenceId: 'provider-preference-1', providerStatus: 'created' })),
       getPayment: vi.fn(),
    }
    const repository = {
      initialize: vi.fn(async () => ({ attemptId: 'attempt-1', orderId: 'order-1', reservationExpiresAt: new Date('2026-09-18T16:40:00.000Z') })),
        findSnapshot: vi.fn(async () => ({ amount: 1250, attemptId: 'attempt-1', items: [{ currency: 'ARS' as const, quantity: 1, title: 'Paint set', unitPrice: 1250 }], orderId: 'order-1', orderNumber: 'MAD-1' })),
      recordProviderFailure: vi.fn(),
       recordProviderPreference: vi.fn(),
    }

    await new PaymentCheckoutService(repository, sessionService, provider, enabledConfig, logger)
      .create({ ...request, deliveryMethod: 'shipping', shippingAddress: 'Calle 1 123' }, null, 'checkout-key-123456')

     expect(provider.createPreference).toHaveBeenCalledWith(expect.objectContaining({ amount: 1250, currency: 'ARS' }))
  })

  it('reuses the same provider key after a timeout', async () => {
    const provider: PaymentProvider = {
       createPreference: vi.fn()
        .mockRejectedValueOnce(new Error('timeout'))
         .mockResolvedValueOnce({ checkoutUrl: 'https://checkout.test', providerPreferenceId: 'provider-preference-1', providerStatus: 'created' }),
       getPayment: vi.fn(),
    }
    const repository = {
      initialize: vi.fn(async () => ({ attemptId: 'attempt-1', orderId: 'order-1', reservationExpiresAt: new Date('2026-09-18T16:40:00.000Z') })),
       findSnapshot: vi.fn(async () => ({ amount: 1250, attemptId: 'attempt-1', items: [{ currency: 'ARS' as const, quantity: 1, title: 'Paint set', unitPrice: 1250 }], orderId: 'order-1', orderNumber: 'MAD-1' })),
      recordProviderFailure: vi.fn(),
       recordProviderPreference: vi.fn(),
    }
    const service = new PaymentCheckoutService(repository, sessionService, provider, enabledConfig, logger)

    await expect(service.create(request, null, 'checkout-key-123456')).rejects.toMatchObject({
      code: 'PAYMENT_PROVIDER_UNAVAILABLE',
    })
    await service.create(request, null, 'checkout-key-123456')

     const firstKey = vi.mocked(provider.createPreference).mock.calls[0]![0].idempotencyKey
     const secondKey = vi.mocked(provider.createPreference).mock.calls[1]![0].idempotencyKey
    expect(secondKey).toBe(firstKey)
     expect(vi.mocked(provider.createPreference).mock.calls[0]![0]).not.toHaveProperty('paymentMethodId')
  })

  it('preserves the provider failure when manual-review persistence also fails', async () => {
    const providerError = new AppError(429, 'Provider is rate limited', 'PROVIDER_RATE_LIMIT')
    const provider: PaymentProvider = {
       createPreference: vi.fn().mockRejectedValue(providerError),
       getPayment: vi.fn(),
    }
    const repository = {
      initialize: vi.fn(async () => ({ attemptId: 'attempt-1', orderId: 'order-1', reservationExpiresAt: new Date('2026-09-18T16:40:00.000Z') })),
      findSnapshot: vi.fn(async () => ({ amount: 1250, attemptId: 'attempt-1', items: [], orderId: 'order-1', orderNumber: 'MAD-1' })),
      recordProviderFailure: vi.fn().mockRejectedValue(new Error('database token=secret customer phone 1123456789')),
       recordProviderPreference: vi.fn(),
    }
    const service = new PaymentCheckoutService(repository, sessionService, provider, enabledConfig, logger)

    await expect(service.create(request, null, 'checkout-key-123456')).rejects.toBe(providerError)
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain('database token=secret customer phone 1123456789')
  })

  it('exposes the creation route only through the validated boundary', async () => {
    const create = vi.fn(async () => ({
      checkoutUrl: 'https://www.mercadopago.com/checkout/v1/redirect',
      orderNumber: 'MAD-20260918-000001',
      reservationExpiresAt: new Date('2026-09-18T16:40:00.000Z'),
      sessionExpiresAt: new Date('2026-09-18T17:00:00.000Z'),
      sessionTokenToSet: null,
    }))
    const app = express()
    app.use(express.json())
    app.use('/checkout', createPaymentCheckoutRouter({
      csrfService: { verifyToken: () => true } as never,
      paymentCheckoutController: { create } as never,
    }, { corsAllowedOrigins: ['http://localhost:5173'] }))
    app.use(((_error, _request, response, _next): void => {
      void _next
      response.status(400).end()
    }) satisfies ErrorRequestHandler)

    await requestAgent(app)
      .post('/checkout')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', '__Host-mad-csrf=valid')
      .set('X-CSRF-Token', 'valid')
      .set('Idempotency-Key', 'checkout-key-123456')
      .send({ ...request, items: [] })
      .expect(400)
    expect(create).not.toHaveBeenCalled()
  })
})
