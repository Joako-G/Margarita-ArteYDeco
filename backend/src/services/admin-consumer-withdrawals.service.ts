import type { IConsumerWithdrawalRepository } from '../repositories/consumer-withdrawals.repository.js'
import { normalizePhone } from '../schemas/orders.schema.js'
import type {
  ConsumerWithdrawalActionType,
  IAdminConsumerWithdrawalActionRequest,
  IAdminConsumerWithdrawalContingencyRequest,
  IAdminConsumerWithdrawalDetailDto,
  IAdminConsumerWithdrawalOrderLinkRequest,
  IConsumerWithdrawalAcknowledgementDto,
  IConsumerWithdrawalListDto,
  IConsumerWithdrawalListFilters,
  IConsumerWithdrawalListItemDto,
  IConsumerWithdrawalRecord,
  IConsumerWithdrawalOrderCandidateDto,
} from '../types/consumer-withdrawals.js'
import { AppError } from '../utils/app-error.js'
import type { ConsumerWithdrawalProtectionService } from './consumer-withdrawal-protection.service.js'

export interface IAdminConsumerWithdrawalService {
  createContingency(
    input: IAdminConsumerWithdrawalContingencyRequest,
    actorProfileId: string,
    idempotencyKey: string,
  ): Promise<IConsumerWithdrawalAcknowledgementDto>
  executeAction(
    requestId: string,
    input: IAdminConsumerWithdrawalActionRequest,
    actorProfileId: string,
    idempotencyKey: string,
  ): Promise<IAdminConsumerWithdrawalDetailDto>
  getById(requestId: string): Promise<IAdminConsumerWithdrawalDetailDto>
  getOrderCandidates(requestId: string): Promise<readonly IConsumerWithdrawalOrderCandidateDto[]>
  linkOrder(
    requestId: string,
    input: IAdminConsumerWithdrawalOrderLinkRequest,
    actorProfileId: string,
    idempotencyKey: string,
  ): Promise<IAdminConsumerWithdrawalDetailDto>
  list(filters: IConsumerWithdrawalListFilters): Promise<IConsumerWithdrawalListDto>
}

function getAvailableActions(record: IConsumerWithdrawalRecord): readonly ConsumerWithdrawalActionType[] {
  const actions: ConsumerWithdrawalActionType[] = []
  if (record.refundStatus === 'succeeded') actions.push('correctManualRefund')
  if (record.requestStatus === 'received') actions.push('requestVerification', 'startReview')
  if (record.requestStatus === 'verification_pending') actions.push('startReview')
  if (record.requestStatus === 'under_review') {
    actions.push('determineApplicable', 'determineNotApplicable')
  }
  if (record.requestStatus === 'applicable') {
    if (record.returnStatus === 'pending') actions.push('receiveReturn')
    if (record.returnStatus === 'received') actions.push('inspectReturn')
    if (record.refundStatus === 'pending') actions.push('markRefundProcessing', 'confirmManualRefund')
    if (record.refundStatus === 'processing') {
      actions.push('confirmManualRefund', 'markRefundManualReview')
    }
    if (record.refundStatus === 'failed') {
      actions.push('confirmManualRefund', 'markRefundManualReview')
    }
    if (record.refundStatus === 'manual_review') {
      actions.push('confirmManualRefund')
    }
    const returnComplete = ['inspected', 'not_required'].includes(record.returnStatus)
    const refundComplete = ['not_required', 'succeeded'].includes(record.refundStatus)
    if (returnComplete && refundComplete) actions.push('close')
  }
  return actions
}

export class AdminConsumerWithdrawalService implements IAdminConsumerWithdrawalService {
  public constructor(
    private readonly repository: IConsumerWithdrawalRepository,
    private readonly protection: ConsumerWithdrawalProtectionService,
  ) {}

  public async list(filters: IConsumerWithdrawalListFilters): Promise<IConsumerWithdrawalListDto> {
    const page = await this.repository.findPage(filters)
    const totalPages = Math.ceil(page.totalItems / filters.pageSize)
    return {
      items: page.items.map((record) => this.mapListItem(record)),
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

  public async getById(requestId: string): Promise<IAdminConsumerWithdrawalDetailDto> {
    const record = await this.requireRecord(requestId)
    const [events, settlement, orderSnapshot, returnItems] = await Promise.all([
      this.repository.findEvents(requestId),
      this.repository.findSettlement(requestId),
      record.orderId === null
        ? Promise.resolve(null)
        : this.repository.findOrderRefundSnapshot(record.orderId),
      record.orderId === null
        ? Promise.resolve([])
        : this.repository.findReturnItems(requestId, record.orderId),
    ])
    const capturedContractAmount = orderSnapshot?.paymentStatus === 'paid'
      ? orderSnapshot.total
      : 0
    const contractAmount = settlement?.contractAmount ?? capturedContractAmount
    const originalShippingAmount = settlement?.originalShippingAmount ?? 0
    const returnShippingAmount = settlement?.returnShippingAmount ?? 0
    return {
      ...this.mapListItem(record),
      availableActions: getAvailableActions(record),
      comment: record.customerComment,
      deadline: {
        contractConcludedAt: orderSnapshot?.contractConcludedAt ?? null,
        fulfillmentAt: orderSnapshot === null
          ? null
          : orderSnapshot.deliveryMethod === 'shipping'
            ? orderSnapshot.deliveredAt
            : orderSnapshot.pickedUpAt,
        legalDeadlineAt: record.legalDeadlineAt,
        status: record.legalTimeStatus,
      },
      evaluation: {
        internalReason: record.resolutionReason,
        publicExplanation: record.publicExplanation,
      },
      order: record.orderId === null || orderSnapshot === null
        ? null
        : {
          deliveryMethod: orderSnapshot.deliveryMethod,
          id: record.orderId,
          orderNumber: orderSnapshot.orderNumber,
          paymentMethod: orderSnapshot.method,
          paymentStatus: orderSnapshot.paymentStatus,
          status: orderSnapshot.status,
          total: orderSnapshot.total,
        },
      phone: record.contactPhoneNormalized,
      refund: {
        contractAmount,
        method: orderSnapshot?.method ?? null,
        originalShippingAmount,
        returnShippingAmount,
        status: record.refundStatus,
        totalAmount: settlement?.totalAmount
          ?? contractAmount + originalShippingAmount + returnShippingAmount,
      },
      return: { items: returnItems, status: record.returnStatus },
      timeline: events,
    }
  }

  public async getOrderCandidates(
    requestId: string,
  ): Promise<readonly IConsumerWithdrawalOrderCandidateDto[]> {
    const record = await this.requireRecord(requestId)
    if (record.orderId !== null) return []
    return this.repository.findOrderCandidates(record.contactPhoneNormalized)
  }

  public async executeAction(
    requestId: string,
    input: IAdminConsumerWithdrawalActionRequest,
    actorProfileId: string,
    idempotencyKey: string,
  ): Promise<IAdminConsumerWithdrawalDetailDto> {
    const record = await this.requireRecord(requestId)
    this.validateVersion(record, input.expectedVersion)
    if (!getAvailableActions(record).includes(input.action)) {
      throw new AppError(409, 'La acción ya no está disponible', 'WITHDRAWAL_ACTION_NOT_ALLOWED')
    }
    const idempotency = this.protection.createAdminIdempotencyMaterial(
      idempotencyKey,
      `action:${input.action}`,
      {
        expectedVersion: input.expectedVersion,
        confirmedTotalRefundAmount: input.confirmedTotalRefundAmount ?? null,
        publicExplanation: input.publicExplanation ?? null,
        reason: input.reason ?? null,
        reference: input.reference ?? null,
        requestId,
        returnItems: input.returnItems ?? null,
        returnShippingRefundAmount: input.returnShippingRefundAmount ?? 0,
      },
    )
    if (input.action === 'inspectReturn') {
      if (input.reason === undefined || input.returnItems === undefined) {
        throw new AppError(
          409,
          'Completá la condición de todas las unidades recibidas',
          'WITHDRAWAL_RETURN_ITEMS_REQUIRED',
        )
      }
      await this.repository.inspectReturn({
        actorProfileId,
        expectedVersion: input.expectedVersion,
        ...idempotency,
        items: input.returnItems,
        reason: input.reason,
        requestId,
      })
      return this.getById(requestId)
    }
    if (input.action === 'confirmManualRefund') {
      if (record.orderId === null || input.reference === undefined
        || input.confirmedTotalRefundAmount === undefined) {
        throw new AppError(409, 'Primero vinculá el pedido y completá la referencia', 'WITHDRAWAL_REFUND_DATA_REQUIRED')
      }
      const snapshot = await this.repository.findOrderRefundSnapshot(record.orderId)
      if (snapshot === null) throw new AppError(404, 'Pedido no encontrado', 'ADMIN_ORDER_NOT_FOUND')
      const returnShippingRefundAmount = input.returnShippingRefundAmount ?? 0
      const expectedTotal = snapshot.total + returnShippingRefundAmount
      if (Math.abs(expectedTotal - input.confirmedTotalRefundAmount) >= 0.005) {
        throw new AppError(409, 'El total confirmado no coincide con el desglose', 'WITHDRAWAL_REFUND_TOTAL_MISMATCH')
      }
      await this.repository.recordSettlement({
        actorProfileId,
        contractRefundAmount: snapshot.total,
        expectedVersion: input.expectedVersion,
        ...idempotency,
        method: snapshot.method,
        notes: input.reason ?? null,
        reference: input.reference,
        requestId,
        returnShippingRefundAmount,
      })
      return this.getById(requestId)
    }
    if (input.action === 'correctManualRefund') {
      if (input.confirmedTotalRefundAmount === undefined || input.reason === undefined) {
        throw new AppError(409, 'Completá el importe corregido y su motivo', 'WITHDRAWAL_REFUND_CORRECTION_REQUIRED')
      }
      await this.repository.correctSettlement({
        actorProfileId,
        confirmedTotalRefundAmount: input.confirmedTotalRefundAmount,
        expectedVersion: input.expectedVersion,
        ...idempotency,
        reason: input.reason,
        requestId,
        returnShippingRefundAmount: input.returnShippingRefundAmount ?? 0,
      })
      return this.getById(requestId)
    }
    await this.repository.transition({
      action: input.action,
      actorProfileId,
      expectedVersion: input.expectedVersion,
      ...idempotency,
      publicExplanation: input.publicExplanation ?? null,
      reason: input.reason ?? null,
      requestId,
    })
    return this.getById(requestId)
  }

  public async linkOrder(
    requestId: string,
    input: IAdminConsumerWithdrawalOrderLinkRequest,
    actorProfileId: string,
    idempotencyKey: string,
  ): Promise<IAdminConsumerWithdrawalDetailDto> {
    const record = await this.requireRecord(requestId)
    this.validateVersion(record, input.expectedVersion)
    if (['closed', 'not_applicable'].includes(record.requestStatus)) {
      throw new AppError(409, 'La solicitud ya no admite vinculación', 'WITHDRAWAL_LINK_NOT_ALLOWED')
    }
    const idempotency = this.protection.createAdminIdempotencyMaterial(
      idempotencyKey,
      'link_order',
      {
        expectedVersion: input.expectedVersion,
        note: input.note,
        orderId: input.orderId,
        requestId,
      },
    )
    await this.repository.linkOrder({
      actorProfileId,
      expectedVersion: input.expectedVersion,
      ...idempotency,
      note: input.note,
      orderId: input.orderId,
      requestId,
    })
    return this.getById(requestId)
  }

  public async createContingency(
    input: IAdminConsumerWithdrawalContingencyRequest,
    actorProfileId: string,
    idempotencyKey: string,
  ): Promise<IConsumerWithdrawalAcknowledgementDto> {
    const submittedAt = new Date(input.receivedAt)
    if (submittedAt.getTime() > Date.now() + 60_000) {
      throw new AppError(400, 'La recepción no puede estar en el futuro', 'INVALID_RECEIVED_AT')
    }
    const phoneNormalized = normalizePhone(input.phone)
    const orderReference = input.orderNumber?.trim().toUpperCase() ?? null
    const material = this.protection.createMaterial(idempotencyKey, {
      note: input.note,
      orderNumber: orderReference,
      orderNumberUnavailable: input.orderNumberUnavailable,
      phone: phoneNormalized,
      receivedAt: submittedAt.toISOString(),
    }, phoneNormalized)
    const created = await this.repository.create({
      actorProfileId,
      comment: input.note,
      contactFingerprint: material.contactFingerprint,
      idempotencyKeyHash: material.idempotencyKeyHash,
      ipFingerprint: null,
      orderReference,
      orderReferenceUnavailable: input.orderNumberUnavailable,
      payloadFingerprint: material.payloadFingerprint,
      phoneNormalized,
      publicCodeHash: material.publicCodeHash,
      publicCodeSuffix: material.publicCodeSuffix,
      source: 'admin_whatsapp_contingency',
      submittedAt: submittedAt.toISOString(),
    })
    return {
      message: 'La solicitud de contingencia quedó registrada.',
      nextStep: 'Compartí el código con la persona solicitante.',
      requestCode: material.publicCode,
      status: 'received',
      submittedAt: created.submittedAt,
    }
  }

  private async requireRecord(requestId: string): Promise<IConsumerWithdrawalRecord> {
    const record = await this.repository.findById(requestId)
    if (record === null) {
      throw new AppError(404, 'Solicitud no encontrada', 'WITHDRAWAL_NOT_FOUND')
    }
    return record
  }

  private mapListItem(record: IConsumerWithdrawalRecord): IConsumerWithdrawalListItemDto {
    return {
      administrativeCode: `AR-••••-${record.publicCodeSuffix}`,
      firstReviewDueAt: record.firstReviewDueAt,
      id: record.id,
      isDeadlineReviewRequired: record.legalTimeStatus === 'review_required',
      order: record.orderId === null || record.orderNumber === null
        ? null
        : { id: record.orderId, orderNumber: record.orderNumber },
      requestStatus: record.requestStatus,
      submittedAt: record.submittedAt,
      updatedAt: record.updatedAt,
      version: record.version,
    }
  }

  private validateVersion(record: IConsumerWithdrawalRecord, expectedVersion: number): void {
    if (record.version !== expectedVersion) {
      throw new AppError(
        409,
        'La solicitud cambió mientras la revisabas. Recargá el detalle',
        'WITHDRAWAL_UPDATE_CONFLICT',
      )
    }
  }
}
