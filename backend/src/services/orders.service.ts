import type { Logger } from 'pino'
import { createHash } from 'node:crypto'

import type { IOrderRepository } from '../repositories/orders.repository.js'
import { normalizePhone } from '../schemas/orders.schema.js'
import type { IGuestSessionService } from './guest-sessions.service.js'
import type { IOrderConfirmationService } from './order-confirmation.service.js'
import type {
  ICreateOrderInput,
  IPublicOrderConfirmationDto,
  PublicPaymentMethodType,
} from '../types/orders.js'
import type { IGuestSessionContext } from '../types/guest-session.js'
import { AppError } from '../utils/app-error.js'

export interface ICreateOrderRequest {
  customer: {
    firstName: string
    lastName: string
    notes: string
    phone: string
  }
  deliveryMethod: 'pickup' | 'shipping'
  items: readonly {
    productId: string
    quantity: number
  }[]
  paymentMethod: PublicPaymentMethodType
  shippingAddress: string
}

function createRequestFingerprint(request: ICreateOrderRequest): string {
  return createHash('sha256').update(JSON.stringify({
    customer: {
      firstName: request.customer.firstName,
      lastName: request.customer.lastName,
      notes: request.customer.notes,
      phone: normalizePhone(request.customer.phone),
    },
    deliveryMethod: request.deliveryMethod,
    items: [...request.items].sort((left, right) => left.productId.localeCompare(right.productId)),
    paymentMethod: request.paymentMethod,
    shippingAddress: request.shippingAddress,
  })).digest('hex')
}

export interface ICreatedOrderResult {
  confirmation: IPublicOrderConfirmationDto
  sessionExpiresAt: Date
  sessionTokenToSet: string | null
}

export interface IOrderService {
  create(
    request: ICreateOrderRequest,
    currentSessionToken: string | null,
    idempotencyKey: string,
  ): Promise<ICreatedOrderResult>
}

export class OrderConfirmationUnavailableError extends AppError {
  public constructor(public readonly session: IGuestSessionContext) {
    super(
      503,
      'El pedido fue creado, pero no fue posible obtener su confirmación. No vuelvas a enviarlo',
      'ORDER_CONFIRMATION_UNAVAILABLE',
    )
    this.name = 'OrderConfirmationUnavailableError'
  }
}

export class OrderService implements IOrderService {
  public constructor(
    private readonly repository: IOrderRepository,
    private readonly guestSessionService: IGuestSessionService,
    private readonly confirmationService: IOrderConfirmationService,
    private readonly logger: Logger,
  ) {}

  public async create(
    request: ICreateOrderRequest,
    currentSessionToken: string | null,
    idempotencyKey: string,
  ): Promise<ICreatedOrderResult> {
    const session = await this.guestSessionService.getOrCreate(currentSessionToken)
    const input: ICreateOrderInput = {
      customer: {
        firstName: request.customer.firstName,
        lastName: request.customer.lastName,
        notes: request.customer.notes.length === 0 ? null : request.customer.notes,
        phone: request.customer.phone,
        phoneNormalized: normalizePhone(request.customer.phone),
      },
      deliveryMethod: request.deliveryMethod,
      items: request.items,
      idempotencyKey,
      requestFingerprint: createRequestFingerprint(request),
      paymentMethod: request.paymentMethod === 'transfer' ? 'bank_transfer' : 'cash',
      shippingAddress: request.deliveryMethod === 'shipping' && request.shippingAddress.length > 0
        ? request.shippingAddress
        : null,
    }

    let created

    try {
      created = await this.repository.createWithStock(session.id, input)
    } catch (error) {
      try {
        await this.guestSessionService.revokeCreatedSession(session)
      } catch {
        this.logger.warn({ sessionId: session.id }, 'No fue posible revocar una sesión sin pedido')
      }

      throw error
    }

    try {
      const confirmation = await this.confirmationService.get(created.orderId, session.id)

      if (confirmation === null) {
        throw new OrderConfirmationUnavailableError(session)
      }

      return {
        confirmation,
        sessionExpiresAt: session.expiresAt,
        sessionTokenToSet: session.tokenToSet,
      }
    } catch (error) {
      if (error instanceof OrderConfirmationUnavailableError) {
        throw error
      }

      throw new OrderConfirmationUnavailableError(session)
    }
  }

}
