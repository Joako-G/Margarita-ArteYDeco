import { createHash } from 'node:crypto'
import type { Logger } from 'pino'

import type { MercadoPagoConfig } from '../payments/config.js'
import { createPaymentIdempotencyKey } from '../payments/idempotency.js'
import type { CreatedPaymentPreference, PaymentProvider } from '../payments/types.js'
import type { IPaymentCheckoutRepository } from '../repositories/payment-checkout.repository.js'
import type { IGuestSessionService } from './guest-sessions.service.js'
import type { IPublicOrderService } from './public-orders.service.js'
import { normalizePhone } from '../schemas/orders.schema.js'
import { AppError } from '../utils/app-error.js'

export interface PaymentCheckoutRequest {
  customer: { firstName: string; lastName: string; notes: string; phone: string }
  deliveryMethod: 'pickup' | 'shipping'
  items: readonly { productId: string; quantity: number }[]
  paymentMethod: 'mercado_pago'
  shippingAddress: string
}

export interface PaymentCheckoutResult {
  checkoutUrl: string
  orderNumber: string
  reservationExpiresAt: Date
}

export interface PaymentStatusResult {
  nextAction: 'contact_support' | 'recover' | 'refresh' | 'view_order'
  orderNumber: string
  reservationExpiresAt: Date
  status: 'approved' | 'expired' | 'manual-review' | 'pending' | 'rejected'
}

function fingerprint(request: PaymentCheckoutRequest): string {
  return createHash('sha256').update(JSON.stringify({
    ...request,
    customer: { ...request.customer, phone: normalizePhone(request.customer.phone) },
    items: [...request.items].sort((a, b) => a.productId.localeCompare(b.productId)),
  })).digest('hex')
}

function expandOrderNumber(url: string, orderNumber: string): string {
  return url.replaceAll('{orderNumber}', encodeURIComponent(orderNumber))
}

export interface IPaymentCheckoutService {
  create(
    request: PaymentCheckoutRequest,
    sessionToken: string | null,
    idempotencyKey: string,
  ): Promise<PaymentCheckoutResult & { sessionExpiresAt: Date; sessionTokenToSet: string | null }>
  resume(orderNumber: string, sessionToken: string | null): Promise<PaymentCheckoutResult>
  getStatus(orderNumber: string, sessionToken: string | null): Promise<PaymentStatusResult>
}

export class PaymentCheckoutService implements IPaymentCheckoutService {
  public constructor(
    private readonly repository: IPaymentCheckoutRepository,
    private readonly sessions: IGuestSessionService,
    private readonly provider: PaymentProvider | null,
    private readonly config: MercadoPagoConfig,
    private readonly logger: Logger,
    private readonly publicOrders?: IPublicOrderService,
  ) {}

  public async create(
    request: PaymentCheckoutRequest,
    sessionToken: string | null,
    idempotencyKey: string,
  ): Promise<PaymentCheckoutResult & { sessionExpiresAt: Date; sessionTokenToSet: string | null }> {
    if (!this.config.enabled || this.config.validationError !== null || this.provider === null) {
      throw new AppError(503, 'Mercado Pago no está disponible', 'PAYMENT_METHOD_DISABLED')
    }

    const session = await this.sessions.getOrCreate(sessionToken)
    const initialized = await this.repository.initialize(session.id, {
      p_customer_first_name: request.customer.firstName,
      p_customer_last_name: request.customer.lastName,
      p_customer_phone: request.customer.phone,
      p_customer_phone_normalized: normalizePhone(request.customer.phone),
      p_items: request.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
      p_idempotency_key: idempotencyKey,
      p_request_fingerprint: fingerprint(request),
      p_environment: this.config.environment,
      p_delivery_method: request.deliveryMethod,
      p_shipping_address: request.deliveryMethod === 'shipping' ? request.shippingAddress : null,
      p_notes: request.customer.notes || null,
    })
    const snapshot = await this.repository.findSnapshot(initialized.attemptId)
    const providerKey = createPaymentIdempotencyKey(snapshot.orderId, snapshot.attemptId, 'create_preference')

    let result: CreatedPaymentPreference
    try {
      result = await this.provider.createPreference({
        amount: snapshot.amount,
        backUrls: {
          failure: expandOrderNumber(this.config.failureUrl!, snapshot.orderNumber),
          pending: expandOrderNumber(this.config.pendingUrl!, snapshot.orderNumber),
          success: expandOrderNumber(this.config.successUrl!, snapshot.orderNumber),
        },
        currency: 'ARS',
        externalReference: snapshot.orderNumber,
        idempotencyKey: providerKey,
        items: snapshot.items,
      })
    } catch (error) {
      try {
        await this.repository.recordProviderFailure(snapshot.attemptId, 'Provider preference creation failed')
      } catch {
        this.logger.error({ attemptId: snapshot.attemptId, operation: 'record_provider_failure' }, 'Could not record Mercado Pago provider failure')
      }
      this.logger.warn({ attemptId: snapshot.attemptId }, 'Mercado Pago preference creation failed')
      if (error instanceof AppError) throw error
      throw new AppError(503, 'No fue posible iniciar el checkout de Mercado Pago', 'PAYMENT_PROVIDER_UNAVAILABLE')
    }

    try {
      await this.repository.recordProviderPreference(snapshot.attemptId, providerKey, result)
    } catch (error) {
      try {
        await this.repository.recordProviderFailure(snapshot.attemptId, 'Provider preference persistence failed')
      } catch {
        this.logger.error({ attemptId: snapshot.attemptId, operation: 'record_provider_failure' }, 'Could not record Mercado Pago persistence failure')
      }
      throw error
    }

    return {
      checkoutUrl: result.checkoutUrl,
      orderNumber: snapshot.orderNumber,
      reservationExpiresAt: initialized.reservationExpiresAt,
      sessionExpiresAt: session.expiresAt,
      sessionTokenToSet: session.tokenToSet,
    }
  }

  public async resume(orderNumber: string, sessionToken: string | null): Promise<PaymentCheckoutResult> {
    if (!this.config.enabled || this.config.validationError !== null || this.provider === null) {
      throw new AppError(503, 'Mercado Pago no está disponible', 'PAYMENT_METHOD_DISABLED')
    }

    if (this.publicOrders?.authorizeOrder === undefined || this.repository.findResumableAttempt === undefined || this.provider.getPreferenceCheckoutUrl === undefined) {
      throw new AppError(503, 'No fue posible recuperar el checkout de Mercado Pago', 'PAYMENT_NOT_READY')
    }

    const { orderId } = await this.publicOrders.authorizeOrder(orderNumber, sessionToken)
    const attempt = await this.repository.findResumableAttempt(orderId, new Date())

    if (attempt === null) {
      throw new AppError(
        409,
        'No hay un pago disponible para continuar. Actualizá el estado del pedido o contactanos si necesitás ayuda.',
        'PAYMENT_NOT_READY',
      )
    }

    try {
      const checkoutUrl = await this.provider.getPreferenceCheckoutUrl(attempt.providerPreferenceId)

      return {
        checkoutUrl,
        orderNumber,
        reservationExpiresAt: attempt.reservationExpiresAt,
      }
    } catch (error) {
      this.logger.warn({ operation: 'resume_preference_failed' }, 'Mercado Pago preference resume failed')
      if (error instanceof AppError) throw error
      throw new AppError(503, 'No fue posible recuperar el checkout de Mercado Pago', 'PAYMENT_PROVIDER_UNAVAILABLE')
    }
  }

  public async getStatus(orderNumber: string, sessionToken: string | null): Promise<PaymentStatusResult> {
    if (this.publicOrders?.authorizeOrder === undefined || this.repository.findLatestAttempt === undefined) {
      throw new AppError(503, 'No fue posible consultar el pago', 'PAYMENT_NOT_READY')
    }

    const { orderId } = await this.publicOrders.authorizeOrder(orderNumber, sessionToken)
    const attempt = await this.repository.findLatestAttempt(orderId)

    if (attempt === null) {
      throw new AppError(404, 'El pago no está disponible para este pedido', 'PAYMENT_NOT_READY')
    }

    const isExpired = attempt.reservationExpiresAt.getTime() <= Date.now()
    const status = isExpired && (attempt.status === 'pending' || attempt.status === 'rejected')
      ? 'expired'
      : attempt.status === 'manual_review' || attempt.status === 'cancelled'
        ? attempt.status === 'cancelled' ? 'expired' : 'manual-review'
        : attempt.status === 'in_process' ? 'pending' : attempt.status

    return {
      nextAction: status === 'approved' ? 'view_order' : status === 'manual-review' ? 'contact_support' : status === 'expired' ? 'recover' : 'refresh',
      orderNumber,
      reservationExpiresAt: attempt.reservationExpiresAt,
      status,
    }
  }
}
