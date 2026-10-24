import { describe, expect, it, vi } from 'vitest'

import { loadMercadoPagoConfig } from '../payments/config.js'
import { createPaymentIdempotencyKey } from '../payments/idempotency.js'
import { assertAllowedPaymentType, isAllowedPaymentType } from '../payments/methods.js'
import { DefaultOrdersPaymentAdapter } from '../payments/orders-adapter.js'
import { MercadoPagoPreferencesAdapter } from '../payments/mercado-pago-preferences.adapter.js'

describe('Mercado Pago payment boundary', () => {
  const enabledEnvironment = {
    NODE_ENV: 'development' as const,
    MP_ENABLED: '1' as const,
    MP_ACCESS_TOKEN: 'secret',
    MP_WEBHOOK_SECRET: 'a'.repeat(32),
    MP_SUCCESS_URL: 'https://shop.example.test/success',
    MP_PENDING_URL: 'https://shop.example.test/pending',
    MP_FAILURE_URL: 'https://shop.example.test/failure',
    MP_NOTIFICATION_URL: 'https://api.shop.example.test/api/webhooks/mercado-pago',
    MP_EXCLUDED_PAYMENT_TYPE_IDS: 'ticket,atm',
  }
  it('fails closed when enabled configuration has no access token', () => {
    const config = loadMercadoPagoConfig({ NODE_ENV: 'development', MP_ENABLED: '1' })

    expect(config.enabled).toBe(false)
    expect(config.validationError).not.toBeNull()
  })

  it('allows sandbox Mercado Pago in a production Vercel deployment', () => {
    const config = loadMercadoPagoConfig({
      ...enabledEnvironment,
      NODE_ENV: 'production',
      MP_ENVIRONMENT: 'sandbox',
    })

    expect(config.enabled).toBe(true)
    expect(config.environment).toBe('sandbox')
    expect(config.validationError).toBeNull()
  })

  it('fails closed when enabled configuration has no payment exclusions', () => {
    const config = loadMercadoPagoConfig({
      NODE_ENV: 'development',
      MP_ENABLED: '1',
      MP_ACCESS_TOKEN: 'secret',
      MP_WEBHOOK_SECRET: 'a'.repeat(32),
      MP_SUCCESS_URL: 'https://shop.example.test/success',
      MP_PENDING_URL: 'https://shop.example.test/pending',
      MP_FAILURE_URL: 'https://shop.example.test/failure',
    })

    expect(config.enabled).toBe(false)
    expect(config.validationError).not.toBeNull()
  })

  it('fails closed when enabled configuration has no notification URL', () => {
    const config = loadMercadoPagoConfig({
      ...enabledEnvironment,
      MP_NOTIFICATION_URL: undefined,
    })

    expect(config.enabled).toBe(false)
    expect(config.validationError).not.toBeNull()
  })

  it('accepts only balance and debit card payment types', () => {
    expect(isAllowedPaymentType('account_money')).toBe(true)
    expect(isAllowedPaymentType('debit_card')).toBe(true)
    expect(isAllowedPaymentType('credit_card')).toBe(false)
    expect(() => assertAllowedPaymentType('cash')).toThrow()
  })

  it('creates the same key for retries of the same operation', () => {
    expect(createPaymentIdempotencyKey('order-1', 'attempt-1', 'create_preference'))
      .toBe(createPaymentIdempotencyKey('order-1', 'attempt-1', 'create_preference'))
    expect(createPaymentIdempotencyKey('order-1', 'attempt-1', 'create_preference'))
      .not.toBe(createPaymentIdempotencyKey('order-1', 'attempt-2', 'create_preference'))
  })

  it('maps an order snapshot without provider types leaking into orders', () => {
    const result = new DefaultOrdersPaymentAdapter().toPaymentOrder({
      amount: 1250,
      attemptId: 'attempt-1',
      items: [{ currency: 'ARS', quantity: 1, title: 'Paint set', unitPrice: 1250 }],
      orderId: 'order-1',
      orderNumber: 'M-1001',
    }, 'stable-key')

    expect(result).toEqual({
      amount: 1250,
      currency: 'ARS',
      externalReference: 'M-1001',
      idempotencyKey: 'stable-key',
    })
  })

  it('maps a debit card brand to its allowed payment type', async () => {
    const get = vi.fn(async () => ({ data: {
      currency_id: 'ARS',
      date_last_updated: null,
      external_reference: 'M-1001',
      id: 'provider-1',
      status: 'approved',
      transaction_amount: 1250,
      payment_method_id: 'debvisa',
      payment_type_id: 'debit_card',
    } }))
    const http = { defaults: { headers: { common: {} as Record<string, string> }, baseURL: '' }, get, post: vi.fn() }
    const config = loadMercadoPagoConfig(enabledEnvironment)
    const adapter = new MercadoPagoPreferencesAdapter(config, { info: vi.fn(), warn: vi.fn() } as never, http as never)

    await expect(adapter.getPayment('provider-1')).resolves.toMatchObject({ paymentTypeId: 'debit_card' })

    expect(http.defaults.headers.common.Authorization).toBe('Bearer secret')
    expect(http.get).toHaveBeenCalledWith('/v1/payments/provider-1')
  })

  it('rejects a credit card payment type even when a method ID is present', async () => {
    const get = vi.fn(async () => ({ data: {
      currency_id: 'ARS',
      external_reference: 'M-1001',
      id: 'provider-2',
      status: 'approved',
      transaction_amount: 1250,
      payment_method_id: 'visa',
      payment_type_id: 'credit_card',
    } }))
    const http = { defaults: { headers: { common: {} as Record<string, string> }, baseURL: '' }, get, post: vi.fn() }
    const adapter = new MercadoPagoPreferencesAdapter(loadMercadoPagoConfig(enabledEnvironment), { info: vi.fn(), warn: vi.fn() } as never, http as never)

    await expect(adapter.getPayment('provider-2')).rejects.toThrow('Unsupported Mercado Pago payment type: credit_card')
  })

  it('searches payments with a bounded external-reference query and response schema', async () => {
    const get = vi.fn(async () => ({ data: { results: [{
      currency_id: 'ARS', date_last_updated: null, external_reference: 'M-1001', id: 'provider-3',
      status: 'pending', transaction_amount: 1250, payment_type_id: 'debit_card',
    }] } }))
    const http = { defaults: { headers: { common: {} as Record<string, string> }, baseURL: '' }, get, post: vi.fn() }
    const adapter = new MercadoPagoPreferencesAdapter(loadMercadoPagoConfig(enabledEnvironment), { info: vi.fn(), warn: vi.fn() } as never, http as never)

    await expect(adapter.getPaymentsByExternalReference('M-1001')).resolves.toMatchObject([{ id: 'provider-3', externalReference: 'M-1001' }])
    expect(get).toHaveBeenCalledWith('/v1/payments/search', {
      params: { external_reference: 'M-1001', limit: 20, offset: 0, sort: 'date_created', criteria: 'desc' },
      timeout: expect.any(Number),
    })
    await expect(adapter.getPaymentsByExternalReference('bad reference')).rejects.toThrow()
  })

  it('paginates beyond a fixed retry page while bounding the provider operation by time', async () => {
    const result = (index: number): { currency_id: string; external_reference: string; id: string; status: string; transaction_amount: number; payment_type_id: string } => ({ currency_id: 'ARS', external_reference: 'M-1001',
      id: String(index), status: index === 40 ? 'approved' : 'rejected',
      transaction_amount: 1250, payment_type_id: 'debit_card' })
    const get = vi.fn<(_url: string, options: { params: { offset: number }; timeout: number }) => Promise<unknown>>()
      .mockResolvedValueOnce({ data: { results: Array.from({ length: 20 }, (_, i) => result(i)), paging: { total: 41 } } })
      .mockResolvedValueOnce({ data: { results: Array.from({ length: 20 }, (_, i) => result(i + 20)), paging: { total: 41 } } })
      .mockResolvedValueOnce({ data: { results: [result(40)], paging: { total: 41 } } })
    const http = { defaults: { headers: { common: {} }, baseURL: '' }, get, post: vi.fn() }
    const adapter = new MercadoPagoPreferencesAdapter(loadMercadoPagoConfig(enabledEnvironment), { info: vi.fn() } as never, http as never)
    const payments = await adapter.getPaymentsByExternalReference('M-1001')
    expect(payments).toHaveLength(41)
    expect(payments[40]).toMatchObject({ id: '40', status: 'approved', version: null })
    expect(get.mock.calls.map((call) => call[1].params.offset)).toEqual([0, 20, 40])
    expect(get.mock.calls.every((call) => call[1].timeout > 0 && call[1].timeout <= 30_000)).toBe(true)
  })

  it('rejects an incomplete search rather than returning an empty successful result', async () => {
    const get = vi.fn(async () => ({ data: { results: [], paging: { total: 1 } } }))
    const http = { defaults: { headers: { common: {} }, baseURL: '' }, get, post: vi.fn() }
    const adapter = new MercadoPagoPreferencesAdapter(loadMercadoPagoConfig(enabledEnvironment), { info: vi.fn() } as never, http as never)
    await expect(adapter.getPaymentsByExternalReference('M-1001')).rejects.toThrow('Incomplete payment search')
  })

  it('creates a hosted Checkout Pro preference and uses the canonical init point', async () => {
    const post = vi.fn(async () => ({ data: {
      id: 'preference-1',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=preference-1',
      sandbox_init_point: 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=preference-1',
    } }))
    const http = { defaults: { headers: { common: {} as Record<string, string> }, baseURL: '' }, get: vi.fn(), post }
    const adapter = new MercadoPagoPreferencesAdapter(loadMercadoPagoConfig(enabledEnvironment), { info: vi.fn(), warn: vi.fn() } as never, http as never)

    const result = await adapter.createPreference({
      amount: 1250,
      backUrls: { failure: 'https://shop.example.test/failure', pending: 'https://shop.example.test/pending', success: 'https://shop.example.test/success' },
      currency: 'ARS',
      externalReference: 'MAD-1001',
      idempotencyKey: 'stable-key',
      items: [{ currency: 'ARS', quantity: 2, title: 'Paint set', unitPrice: 625 }],
    })

    expect(result).toEqual({
      checkoutUrl: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=preference-1',
      providerPreferenceId: 'preference-1',
      providerStatus: 'created',
    })
    expect(post).toHaveBeenCalledWith('/checkout/preferences', expect.objectContaining({
      external_reference: 'MAD-1001',
      notification_url: enabledEnvironment.MP_NOTIFICATION_URL,
      items: [{ quantity: 2, title: 'Paint set', unit_price: 625, currency_id: 'ARS' }],
      auto_return: 'approved',
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },
    }), { headers: { 'X-Idempotency-Key': 'stable-key' } })
    expect(post).toHaveBeenCalledWith('/checkout/preferences', expect.not.objectContaining({
      payer: expect.anything(),
      transactions: expect.anything(),
    }), expect.anything())
  })

  it('omits automatic return for local HTTP back URLs', async () => {
    const post = vi.fn(async () => ({ data: {
      id: 'preference-local',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=preference-local',
      sandbox_init_point: 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=preference-local',
    } }))
    const http = { defaults: { headers: { common: {} as Record<string, string> }, baseURL: '' }, get: vi.fn(), post }
    const adapter = new MercadoPagoPreferencesAdapter(loadMercadoPagoConfig({
      ...enabledEnvironment,
      MP_FAILURE_URL: 'http://localhost:5173/failure',
      MP_PENDING_URL: 'http://localhost:5173/pending',
      MP_SUCCESS_URL: 'http://localhost:5173/success',
    }), { info: vi.fn(), warn: vi.fn() } as never, http as never)

    await adapter.createPreference({
      amount: 1250,
      backUrls: { failure: 'http://localhost:5173/failure', pending: 'http://localhost:5173/pending', success: 'http://localhost:5173/success' },
      currency: 'ARS',
      externalReference: 'MAD-local',
      idempotencyKey: 'stable-local',
      items: [{ currency: 'ARS', quantity: 1, title: 'Paint set', unitPrice: 1250 }],
    })

    expect(post).toHaveBeenCalledWith('/checkout/preferences', expect.objectContaining({
      back_urls: { failure: 'http://localhost:5173/failure', pending: 'http://localhost:5173/pending', success: 'http://localhost:5173/success' },
    }), expect.anything())
    expect(post).toHaveBeenCalledWith('/checkout/preferences', expect.not.objectContaining({
      auto_return: expect.anything(),
    }), expect.anything())
  })

  it('uses the production init point and never treats the preference as a payment', async () => {
    const http = {
      defaults: { headers: { common: {} as Record<string, string> }, baseURL: '' },
      get: vi.fn(),
      post: vi.fn(async () => ({ data: {
         id: 'preference-2',
         init_point: 'https://www.mercadopago.com/checkout/v1/redirect?pref_id=preference-2',
      } })),
    }
    const adapter = new MercadoPagoPreferencesAdapter(loadMercadoPagoConfig({ ...enabledEnvironment, MP_ENVIRONMENT: 'production', NODE_ENV: 'production' }), { info: vi.fn(), warn: vi.fn() } as never, http as never)

    await expect(adapter.createPreference({
      amount: 1250,
      backUrls: { failure: 'https://shop.example.test/failure', pending: 'https://shop.example.test/pending', success: 'https://shop.example.test/success' },
      currency: 'ARS',
      externalReference: 'MAD-1002',
      idempotencyKey: 'stable-key-2',
      items: [{ currency: 'ARS', quantity: 1, title: 'Paint set', unitPrice: 1250 }],
    })).resolves.toMatchObject({
        checkoutUrl: 'https://www.mercadopago.com/checkout/v1/redirect?pref_id=preference-2',
        providerPreferenceId: 'preference-2',
      })
    expect(http.post).toHaveBeenCalledWith('/checkout/preferences', expect.anything(), expect.anything())
    expect(http.get).not.toHaveBeenCalledWith('/v1/payments/preference-2')
  })

  it('retrieves an existing preference and uses the canonical checkout URL', async () => {
    const get = vi.fn(async () => ({ data: {
      id: 'preference-existing',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=preference-existing',
      sandbox_init_point: 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=preference-existing',
    } }))
    const http = { defaults: { headers: { common: {} as Record<string, string> }, baseURL: '' }, get, post: vi.fn() }
    const adapter = new MercadoPagoPreferencesAdapter(loadMercadoPagoConfig(enabledEnvironment), { error: vi.fn() } as never, http as never)

    await expect(adapter.getPreferenceCheckoutUrl('preference-existing')).resolves.toBe(
      'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=preference-existing',
    )
    expect(get).toHaveBeenCalledWith('/checkout/preferences/preference-existing')
  })

  it('logs safe diagnostics when an existing preference cannot be retrieved', async () => {
    const providerError = { isAxiosError: true, response: { status: 404, data: { message: 'token=secret' } } }
    const logger = { error: vi.fn() }
    const http = { defaults: { headers: { common: {} as Record<string, string> }, baseURL: '' }, get: vi.fn().mockRejectedValue(providerError), post: vi.fn() }
    const adapter = new MercadoPagoPreferencesAdapter(loadMercadoPagoConfig(enabledEnvironment), logger as never, http as never)

    await expect(adapter.getPreferenceCheckoutUrl('preference-existing')).rejects.toBe(providerError)
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ operation: 'get_preference', statusCode: 404 }), expect.any(String))
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('token=secret')
  })

  it('logs only bounded safe provider diagnostics on order failure', async () => {
    const providerError = {
      isAxiosError: true,
      response: {
        data: {
          code: 'invalid_request',
          message: 'authorization token=secret customer phone 1123456789',
        },
        status: 400,
      },
    }
    const post = vi.fn().mockRejectedValue(providerError)
    const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    const http = { defaults: { headers: { common: {} as Record<string, string> }, baseURL: '' }, get: vi.fn(), post }
    const adapter = new MercadoPagoPreferencesAdapter(loadMercadoPagoConfig(enabledEnvironment), logger as never, http as never)

    await expect(adapter.createPreference({
      amount: 1250,
      backUrls: { failure: 'https://shop.example.test/failure', pending: 'https://shop.example.test/pending', success: 'https://shop.example.test/success' },
      currency: 'ARS',
      externalReference: 'MAD-1003',
      idempotencyKey: 'stable-key-3',
      items: [{ currency: 'ARS', quantity: 1, title: 'Paint set', unitPrice: 1250 }],
    })).rejects.toBe(providerError)
    expect(logger.error).toHaveBeenCalledWith({
      environment: 'sandbox',
      operation: 'create_preference',
      provider: 'mercado_pago',
      providerCode: 'invalid_request',
      statusCode: 400,
    }, expect.any(String))
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('authorization token=secret customer phone 1123456789')
  })
})
