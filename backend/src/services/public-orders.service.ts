import type { IOrderRepository } from '../repositories/orders.repository.js'
import type { IRecoveryRepository } from '../repositories/recovery.repository.js'
import { normalizePhone } from '../schemas/orders.schema.js'
import type {
  IOrderRecoveryRequest,
  IOrderRecoveryResult,
  IPublicOrderConfirmationDto,
} from '../types/orders.js'
import type {
  IRecoveryFingerprints,
  IRecoveryLimit,
  IRecoveryLimitConfig,
} from '../types/recovery.js'
import { AppError } from '../utils/app-error.js'
import type { IGuestSessionService } from './guest-sessions.service.js'
import type { IOrderConfirmationService } from './order-confirmation.service.js'
import type { IRecoveryProtectionService } from './recovery-protection.service.js'
import type { ITurnstileService } from './turnstile.service.js'

export class GuestSessionRequiredError extends AppError {
  public constructor() {
    super(401, 'La sesión de pedidos no está disponible', 'GUEST_SESSION_REQUIRED')
    this.name = 'GuestSessionRequiredError'
  }
}

export class RecoveryBlockedError extends AppError {
  public constructor(public readonly retryAfterSeconds: number) {
    super(
      429,
      'La recuperación está temporalmente bloqueada. Intentá nuevamente más tarde',
      'ORDER_RECOVERY_BLOCKED',
      { retryAfterSeconds },
    )
    this.name = 'RecoveryBlockedError'
  }
}

export interface IPublicOrderService {
  forget(sessionToken: string | null): Promise<void>
  getByNumber(
    orderNumber: string,
    sessionToken: string | null,
  ): Promise<IPublicOrderConfirmationDto>
  getRecent(sessionToken: string | null): Promise<IPublicOrderConfirmationDto | null>
  recover(
    request: IOrderRecoveryRequest,
    sessionToken: string | null,
    ipAddress: string,
  ): Promise<IOrderRecoveryResult>
}

export class PublicOrderService implements IPublicOrderService {
  public constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly recoveryRepository: IRecoveryRepository,
    private readonly guestSessionService: IGuestSessionService,
    private readonly confirmationService: IOrderConfirmationService,
    private readonly protectionService: IRecoveryProtectionService,
    private readonly turnstileService: ITurnstileService,
    private readonly limitConfig: IRecoveryLimitConfig,
  ) {}

  public async forget(sessionToken: string | null): Promise<void> {
    await this.guestSessionService.revokeByToken(sessionToken)
  }

  public async getByNumber(
    orderNumber: string,
    sessionToken: string | null,
  ): Promise<IPublicOrderConfirmationDto> {
    const session = await this.requireSession(sessionToken)
    const orderId = await this.orderRepository.findOrderIdByNumber(orderNumber)

    if (orderId === null) {
      throw this.orderUnavailableError()
    }

    const confirmation = await this.confirmationService.get(orderId, session.id)

    if (confirmation === null) {
      throw this.orderUnavailableError()
    }

    return confirmation
  }

  public async getRecent(
    sessionToken: string | null,
  ): Promise<IPublicOrderConfirmationDto | null> {
    const session = await this.requireSession(sessionToken)
    const orderId = await this.orderRepository.findRecentOrderId(session.id)

    if (orderId === null) {
      return null
    }

    const confirmation = await this.confirmationService.get(orderId, session.id)

    if (confirmation === null) {
      throw this.orderUnavailableError()
    }

    return confirmation
  }

  public async recover(
    request: IOrderRecoveryRequest,
    sessionToken: string | null,
    ipAddress: string,
  ): Promise<IOrderRecoveryResult> {
    const phoneNormalized = normalizePhone(request.phone)
    const fingerprints = this.protectionService.createFingerprints(
      ipAddress,
      request.orderNumber,
      phoneNormalized,
    )
    const currentLimit = await this.recoveryRepository.checkLimit(
      fingerprints,
      this.limitConfig,
    )

    this.throwIfBlocked(currentLimit)

    if (currentLimit.captchaRequired) {
      await this.requireHumanVerification(
        request.turnstileToken,
        ipAddress,
        fingerprints,
      )
    }

    const candidate = await this.orderRepository.findRecoveryCandidate(request.orderNumber)
    const phoneMatches = this.protectionService.phoneMatches(
      phoneNormalized,
      candidate?.phoneNormalized ?? null,
    )

    if (candidate === null || !phoneMatches) {
      const nextLimit = await this.recoveryRepository.registerFailure(
        fingerprints,
        this.limitConfig,
      )

      this.throwIfBlocked(nextLimit)
      throw new AppError(
        404,
        'No fue posible recuperar el pedido con los datos enviados',
        'ORDER_RECOVERY_FAILED',
        { captchaRequired: nextLimit.captchaRequired },
      )
    }

    await this.recoveryRepository.clearFailures(fingerprints)
    const currentSession = await this.guestSessionService.resolve(sessionToken, false)
    const rotatedSession = await this.guestSessionService.rotateForRecovery(
      currentSession?.id ?? null,
      candidate.id,
    )

    if (rotatedSession.tokenToSet === null) {
      throw new AppError(503, 'No fue posible recuperar la sesión', 'SESSION_RECOVERY_FAILED')
    }

    return {
      captchaRequired: false,
      orderNumber: request.orderNumber,
      sessionExpiresAt: rotatedSession.expiresAt,
      sessionToken: rotatedSession.tokenToSet,
    }
  }

  private orderUnavailableError(): AppError {
    return new AppError(
      404,
      'El pedido no está disponible para esta sesión',
      'ORDER_NOT_AVAILABLE',
    )
  }

  private async requireSession(sessionToken: string | null): Promise<{ id: string }> {
    const session = await this.guestSessionService.resolve(sessionToken)

    if (session === null) {
      throw new GuestSessionRequiredError()
    }

    return session
  }

  private async requireHumanVerification(
    turnstileToken: string | undefined,
    ipAddress: string,
    fingerprints: IRecoveryFingerprints,
  ): Promise<void> {
    const verification = turnstileToken === undefined
      ? 'invalid'
      : await this.turnstileService.verify({ ipAddress, token: turnstileToken })

    if (verification === 'valid') {
      return
    }

    if (verification === 'unavailable') {
      throw new AppError(
        503,
        'La verificación de seguridad no está disponible. Intentá nuevamente',
        'HUMAN_VERIFICATION_UNAVAILABLE',
        { captchaRequired: true },
      )
    }

    const nextLimit = await this.recoveryRepository.registerFailure(
      fingerprints,
      this.limitConfig,
    )

    this.throwIfBlocked(nextLimit)
    throw new AppError(
      400,
      'Completá la verificación de seguridad para continuar',
      'HUMAN_VERIFICATION_REQUIRED',
      { captchaRequired: true },
    )
  }

  private throwIfBlocked(limit: IRecoveryLimit): void {
    if (limit.isBlocked) {
      throw new RecoveryBlockedError(Math.max(limit.retryAfterSeconds, 1))
    }
  }
}
