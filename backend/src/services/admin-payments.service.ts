import type { Logger } from 'pino'

import type { IPaymentReconciliationService } from './payment-reconciliation.service.js'
import type { PaymentRetryService } from './payment-retry.service.js'
import type {
  IAdminPaymentRepository,
} from '../repositories/admin-payments.repository.js'
import type {
  IAdminPaymentAttemptDto,
  IAdminPaymentReconciliationDto,
  IAdminPaymentReconciliationFilters,
  IAdminPaymentReviewRequest,
} from '../types/admin-payments.js'
import { AppError } from '../utils/app-error.js'

export interface IAdminPaymentService {
  list(filters: IAdminPaymentReconciliationFilters): Promise<IAdminPaymentReconciliationDto>
  retry(attemptId: string, actorProfileId: string): Promise<void>
  sync(attemptId: string, actorProfileId: string): Promise<{ auditRecorded: boolean }>
  review(attemptId: string, input: IAdminPaymentReviewRequest, actorProfileId: string): Promise<void>
}

export class AdminPaymentService implements IAdminPaymentService {
  public constructor(
    private readonly repository: IAdminPaymentRepository,
    private readonly reconciliation: IPaymentReconciliationService,
    private readonly retryService: PaymentRetryService,
    private readonly logger: Logger,
  ) {}

  public async list(filters: IAdminPaymentReconciliationFilters): Promise<IAdminPaymentReconciliationDto> {
    const page = await this.repository.findPage(filters)
    const audit = await this.repository.findAuditEvents(page.items.map((item) => item.id))
    const items = page.items.map((item): IAdminPaymentAttemptDto => ({
      amount: item.amount,
      attemptNumber: item.attemptNumber,
      auditTimeline: audit.get(item.id) ?? [],
      canRetry: ['dead_letter', 'manual_review'].includes(item.status),
      canReview: ['dead_letter', 'manual_review'].includes(item.status),
      canSync: ['pending', 'manual_review'].includes(item.status),
      createdAt: item.createdAt,
      currency: item.currency,
      id: item.id,
      lastError: item.lastError,
      orderId: item.orderId,
      orderNumber: item.orderNumber,
      providerOrderId: item.providerOrderId,
      providerStatus: item.providerStatus,
      providerUpdatedAt: item.providerUpdatedAt,
      reservationExpiresAt: item.reservationExpiresAt,
      status: item.status,
      transactions: item.transactions,
      updatedAt: item.updatedAt,
    }))
    const totalPages = Math.ceil(page.totalItems / filters.pageSize)
    return {
      items,
      pagination: {
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1,
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems: page.totalItems,
        totalPages,
      },
    }
  }

  public async retry(attemptId: string, actorProfileId: string): Promise<void> {
    const attempt = await this.requireAttempt(attemptId)
    if (!['dead_letter', 'manual_review'].includes(attempt.status)) {
      throw new AppError(409, 'El reintento no está disponible para este estado', 'PAYMENT_RETRY_NOT_ALLOWED')
    }
    const reason = 'Reintento solicitado desde Administración'
    const saved = await this.retryService.retryForAdmin(attemptId, reason)
    if (!saved) throw new AppError(409, 'El pago ya no puede reintentarse', 'PAYMENT_RETRY_CONFLICT')
    await this.repository.recordReview(attemptId, reason, 'retry', actorProfileId)
  }

  public async sync(attemptId: string, actorProfileId: string): Promise<{ auditRecorded: boolean }> {
    const attempt = await this.requireAttempt(attemptId)
    if (!['pending', 'manual_review'].includes(attempt.status)) {
      throw new AppError(409, 'La sincronización no está disponible para este estado', 'PAYMENT_SYNC_NOT_ALLOWED')
    }
    await this.reconciliation.reconcile(attemptId)
    let auditRecorded: boolean
    try {
      auditRecorded = await this.repository.recordSync(attemptId, actorProfileId)
    } catch (error) {
      this.logger.warn({ action: 'payment_sync', actorProfileId, attemptId, error }, 'Administrative payment sync audit failed')
      return { auditRecorded: false }
    }
    if (auditRecorded) {
      this.logger.info({ action: 'payment_sync', actorProfileId, attemptId }, 'Auditoría administrativa')
    } else {
      this.logger.warn({ action: 'payment_sync', actorProfileId, attemptId }, 'Administrative payment sync was not audited')
    }
    return { auditRecorded }
  }

  public async review(attemptId: string, input: IAdminPaymentReviewRequest, actorProfileId: string): Promise<void> {
    const attempt = await this.requireAttempt(attemptId)
    if (!['dead_letter', 'manual_review'].includes(attempt.status)) {
      throw new AppError(409, 'La revisión no está disponible para este estado', 'PAYMENT_REVIEW_NOT_ALLOWED')
    }
    if (input.decision === 'retry') {
      await this.retry(attemptId, actorProfileId)
      return
    }
    const note = input.note?.trim() ?? ''
    if (note.length === 0) throw new AppError(400, 'La nota de revisión es obligatoria', 'PAYMENT_REVIEW_NOTE_REQUIRED')
    const saved = await this.repository.reviewAttempt(attemptId, 'acknowledge', note, actorProfileId)
    if (!saved) throw new AppError(409, 'La revisión ya no está disponible', 'PAYMENT_REVIEW_CONFLICT')
  }

  private async requireAttempt(attemptId: string): Promise<Awaited<ReturnType<IAdminPaymentRepository['findAttempt']>> extends infer T ? Exclude<T, null> : never> {
    const attempt = await this.repository.findAttempt(attemptId)
    if (attempt === null) throw new AppError(404, 'Intento de pago no encontrado', 'PAYMENT_ATTEMPT_NOT_FOUND')
    return attempt
  }
}
