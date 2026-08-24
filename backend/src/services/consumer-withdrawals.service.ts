import type { ITurnstileService } from './turnstile.service.js'
import type { IConsumerWithdrawalRepository } from '../repositories/consumer-withdrawals.repository.js'
import { normalizePhone } from '../schemas/orders.schema.js'
import type {
  IConsumerWithdrawalAcknowledgementDto,
  IConsumerWithdrawalStatusDto,
  ICreateConsumerWithdrawalRequest,
  ConsumerWithdrawalPublicStatusType,
  IConsumerWithdrawalRecord,
} from '../types/consumer-withdrawals.js'
import { AppError } from '../utils/app-error.js'
import type { ConsumerWithdrawalProtectionService } from './consumer-withdrawal-protection.service.js'

export interface IConsumerWithdrawalService {
  create(
    input: ICreateConsumerWithdrawalRequest,
    idempotencyKey: string,
    ipAddress: string,
  ): Promise<IConsumerWithdrawalAcknowledgementDto>
  getStatus(
    requestCode: string,
    captchaToken?: string,
    ipAddress?: string,
  ): Promise<IConsumerWithdrawalStatusDto>
}

export class ConsumerWithdrawalBlockedError extends AppError {
  public constructor(public readonly retryAfterSeconds: number) {
    super(
      429,
      'La solicitud está temporalmente limitada. Usá el canal alternativo si necesitás atención inmediata',
      'WITHDRAWAL_RATE_LIMITED',
      { retryAfterSeconds },
    )
    this.name = 'ConsumerWithdrawalBlockedError'
  }
}

function projectPublicStatus(record: IConsumerWithdrawalRecord): ConsumerWithdrawalPublicStatusType {
  if (record.requestStatus === 'not_applicable') return 'not_applicable'
  if (record.requestStatus === 'closed') return 'closed'
  if (record.requestStatus === 'applicable') {
    return record.returnStatus === 'pending'
      || ['failed', 'manual_review', 'pending'].includes(record.refundStatus)
      ? 'action_required'
      : 'applicable'
  }
  if (record.requestStatus === 'under_review') return 'under_review'
  return 'received'
}

function describeStatus(status: ConsumerWithdrawalPublicStatusType): Pick<IConsumerWithdrawalStatusDto, 'explanation' | 'nextStep'> {
  switch (status) {
    case 'received': return {
      explanation: 'Registramos tu solicitud y estamos verificando la información.',
      nextStep: 'Nos comunicaremos con vos si necesitamos confirmar algún dato.',
    }
    case 'under_review': return {
      explanation: 'Tu solicitud está siendo revisada.',
      nextStep: 'Te informaremos los pasos a seguir por el canal de contacto indicado.',
    }
    case 'applicable': return {
      explanation: 'Determinamos que corresponde ejercer el derecho de arrepentimiento.',
      nextStep: 'Coordinaremos la devolución y la restitución del dinero sin demoras.',
    }
    case 'action_required': return {
      explanation: 'El derecho resulta aplicable y hay pasos de devolución o reintegro pendientes.',
      nextStep: 'Revisá las indicaciones recibidas o comunicate con Atención al cliente.',
    }
    case 'not_applicable': return {
      explanation: 'Luego de revisar la información, determinamos que el derecho de arrepentimiento no resulta aplicable en este caso.',
      nextStep: 'Si necesitás revisar esta decisión, comunicate con Atención al cliente indicando tu código.',
    }
    case 'closed': return {
      explanation: 'La gestión de tu solicitud finalizó.',
      nextStep: 'Conservá el código como constancia de la gestión.',
    }
  }
}

export class ConsumerWithdrawalService implements IConsumerWithdrawalService {
  public constructor(
    private readonly repository: IConsumerWithdrawalRepository,
    private readonly protection: ConsumerWithdrawalProtectionService,
    private readonly turnstile: ITurnstileService,
    private readonly limitConfig: {
      blockDurationMs: number
      captchaThreshold: number
      maxAttempts: number
      windowMs: number
    } = {
      blockDurationMs: 1_800_000,
      captchaThreshold: 3,
      maxAttempts: 5,
      windowMs: 900_000,
    },
  ) {}

  public async create(
    input: ICreateConsumerWithdrawalRequest,
    idempotencyKey: string,
    ipAddress: string,
  ): Promise<IConsumerWithdrawalAcknowledgementDto> {
    if (input.captchaToken !== undefined) {
      const result = await this.turnstile.verify({
        action: 'consumer_withdrawal',
        ipAddress,
        token: input.captchaToken,
      })
      if (result === 'invalid') {
        throw new AppError(400, 'No pudimos validar el control de seguridad', 'INVALID_CAPTCHA')
      }
    }

    const phoneNormalized = normalizePhone(input.phone)
    const orderReference = input.orderNumber?.trim().toUpperCase() ?? null
    const material = this.protection.createMaterial(idempotencyKey, {
      comment: input.comment?.trim() ?? null,
      orderNumber: orderReference,
      orderNumberUnavailable: input.orderNumberUnavailable,
      phone: phoneNormalized,
    }, phoneNormalized)
    const limit = await this.repository.registerAttempt(
      this.protection.fingerprintIp(ipAddress),
      material.contactFingerprint,
      this.limitConfig,
    )
    if (limit.isBlocked) {
      throw new ConsumerWithdrawalBlockedError(Math.max(limit.retryAfterSeconds, 1))
    }
    if (limit.captchaRequired && input.captchaToken === undefined) {
      throw new AppError(
        400,
        'Completá la verificación de seguridad para continuar',
        'HUMAN_VERIFICATION_REQUIRED',
        { captchaRequired: true },
      )
    }
    const created = await this.repository.create({
      comment: input.comment?.trim() || null,
      contactFingerprint: material.contactFingerprint,
      idempotencyKeyHash: material.idempotencyKeyHash,
      ipFingerprint: this.protection.fingerprintIp(ipAddress),
      orderReference,
      orderReferenceUnavailable: input.orderNumberUnavailable,
      payloadFingerprint: material.payloadFingerprint,
      phoneNormalized,
      publicCodeHash: material.publicCodeHash,
      publicCodeSuffix: material.publicCodeSuffix,
      source: 'web',
      submittedAt: null,
    })

    return {
      message: 'Recibimos tu solicitud.',
      nextStep: 'Guardá este código para consultar el estado.',
      requestCode: material.publicCode,
      status: 'received',
      submittedAt: created.submittedAt,
    }
  }

  public async getStatus(
    requestCode: string,
    captchaToken?: string,
    ipAddress?: string,
  ): Promise<IConsumerWithdrawalStatusDto> {
    if (captchaToken !== undefined) {
      const verification = await this.turnstile.verify({
        action: 'consumer_withdrawal',
        ipAddress: ipAddress ?? 'unknown',
        token: captchaToken,
      })
      if (verification === 'invalid') {
        throw new AppError(400, 'No pudimos validar el control de seguridad', 'INVALID_CAPTCHA')
      }
    }
    const record = await this.repository.findByPublicCodeHash(
      this.protection.hashPublicCode(requestCode),
    )
    if (record === null) {
      throw new AppError(
        404,
        'No pudimos consultar la solicitud con los datos ingresados',
        'WITHDRAWAL_STATUS_UNAVAILABLE',
      )
    }
    const status = projectPublicStatus(record)
    const description = describeStatus(status)
    return {
      ...description,
      ...(status === 'not_applicable' && record.publicExplanation !== null
        ? { explanation: record.publicExplanation }
        : {}),
      status,
      submittedAt: record.submittedAt,
      updatedAt: record.updatedAt,
    }
  }
}
