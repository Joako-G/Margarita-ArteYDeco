import axios, { type AxiosInstance } from 'axios'
import type { Logger } from 'pino'
import { z } from 'zod'

import type { MercadoPagoConfig } from './config.js'
import { assertAllowedPaymentType } from './methods.js'
import { logPaymentEvent } from './logging.js'
import { getSafeProviderDiagnostics } from './provider-diagnostics.js'
import type {
  CreatedPaymentPreference,
  CreatePaymentOrder,
  PaymentProvider,
  ProviderPayment,
} from './types.js'

const preferenceResponseSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  init_point: z.string().url(),
  sandbox_init_point: z.string().url().optional(),
})

const paymentResponseSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  external_reference: z.string().min(1),
  transaction_amount: z.coerce.number().positive(),
  currency_id: z.string().min(1),
  status: z.string().min(1),
  date_last_updated: z.string().nullable().optional(),
  payment_type_id: z.string().nullable().optional(),
})

const paymentSearchResponseSchema = z.object({
  results: z.array(paymentResponseSchema).max(20),
  paging: z.object({ total: z.coerce.number().int().nonnegative() }).optional(),
})
const externalReferenceSchema = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._:-]+$/)

const merchantOrderResponseSchema = z.object({
  payments: z.array(z.object({ id: z.union([z.string(), z.number()]).transform(String) })).min(1),
})

export class MercadoPagoPreferencesAdapter implements PaymentProvider {
  private readonly http: AxiosInstance

  public constructor(
    private readonly config: MercadoPagoConfig,
    private readonly logger: Logger,
    httpClient: AxiosInstance = axios.create(),
  ) {
    if (!config.enabled || config.accessToken === null || config.validationError !== null) {
      throw new Error('Mercado Pago provider is not valid for use')
    }

    this.http = httpClient
    this.http.defaults.baseURL = config.apiBaseUrl
    this.http.defaults.headers.common.Authorization = `Bearer ${config.accessToken}`
  }

  public async createPreference(input: CreatePaymentOrder): Promise<CreatedPaymentPreference> {
    try {
      const autoReturn = input.backUrls !== undefined && new URL(input.backUrls.success).protocol === 'https:'
      const response = await this.http.post('/checkout/preferences', {
        items: (input.items ?? []).map((item) => ({
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: item.currency,
        })),
        external_reference: input.externalReference,
        back_urls: input.backUrls,
        notification_url: this.config.notificationUrl,
        ...(autoReturn ? { auto_return: 'approved' as const } : {}),
        payment_methods: {
          excluded_payment_types: [...this.config.excludedPaymentTypeIds].map((id) => ({ id })),
        },
      }, {
        headers: { 'X-Idempotency-Key': input.idempotencyKey },
      })
      const preference = preferenceResponseSchema.parse(response.data)

      logPaymentEvent(this.logger, 'info', {
        environment: this.config.environment,
        operation: 'create_preference',
      }, 'Mercado Pago preference created')

      return {
        checkoutUrl: preference.init_point,
        providerPreferenceId: preference.id,
        providerStatus: 'created',
      }
    } catch (error) {
      const diagnostics = getSafeProviderDiagnostics(error)
      this.logger.error({
        environment: this.config.environment,
        operation: 'create_preference',
        provider: 'mercado_pago',
        ...diagnostics,
      }, 'Mercado Pago preference creation failed')
      throw error
    }
  }

  public async getPreferenceCheckoutUrl(preferenceId: string): Promise<string> {
    try {
      const response = await this.http.get(`/checkout/preferences/${encodeURIComponent(preferenceId)}`)
      const preference = preferenceResponseSchema.parse(response.data)

      return preference.init_point
    } catch (error) {
      const diagnostics = getSafeProviderDiagnostics(error)
      this.logger.error({
        environment: this.config.environment,
        operation: 'get_preference',
        provider: 'mercado_pago',
        ...diagnostics,
      }, 'Mercado Pago preference retrieval failed')
      throw error
    }
  }

  public async getPayment(id: string): Promise<ProviderPayment> {
    const response = await this.http.get(`/v1/payments/${encodeURIComponent(id)}`)
    const payment = paymentResponseSchema.parse(response.data)
    const paymentTypeId = payment.payment_type_id ?? null
    if (paymentTypeId !== null) assertAllowedPaymentType(paymentTypeId)

    return {
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      externalReference: payment.external_reference,
      id: payment.id,
      paymentTypeId,
      status: payment.status,
      updatedAt: payment.date_last_updated ?? null,
      version: null,
    }
  }

  public async getPaymentsByExternalReference(externalReference: string): Promise<readonly ProviderPayment[]> {
    const reference = externalReferenceSchema.parse(externalReference)
    const payments: z.infer<typeof paymentResponseSchema>[] = []
    const seen = new Set<string>()
    const deadline = Date.now() + 30_000
    for (let offset = 0; ; offset += 20) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw new Error('Payment search deadline exceeded')
      const response = await this.http.get('/v1/payments/search', {
        params: { external_reference: reference, limit: 20, offset, sort: 'date_created', criteria: 'desc' },
        timeout: remaining,
      })
      const page = paymentSearchResponseSchema.parse(response.data)
      const fresh = page.results.filter((payment) => !seen.has(payment.id))
      for (const payment of fresh) { seen.add(payment.id); payments.push(payment) }
      if (page.paging !== undefined && offset + page.results.length >= page.paging.total) break
      if (page.results.length < 20) {
        if (page.paging !== undefined && offset + page.results.length < page.paging.total) throw new Error('Incomplete payment search')
        break
      }
      if (fresh.length === 0) throw new Error('Payment search did not advance')
    }
    return payments.map((payment) => ({
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      externalReference: payment.external_reference,
      id: payment.id,
      paymentTypeId: payment.payment_type_id ?? null,
      status: payment.status,
      updatedAt: payment.date_last_updated ?? null,
      version: null,
    }))
  }

  public async getMerchantOrderPaymentIds(id: string): Promise<readonly string[]> {
    const response = await this.http.get(`/merchant_orders/${encodeURIComponent(id)}`)
    return merchantOrderResponseSchema.parse(response.data).payments.map((payment) => payment.id)
  }

  public async getMerchantOrderPaymentId(id: string): Promise<string> {
    return (await this.getMerchantOrderPaymentIds(id))[0]!
  }
}
