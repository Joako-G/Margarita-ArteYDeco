import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

import type { ServerSupabaseClient } from '../config/supabase.js'
import {
  consumerWithdrawalCandidateRowsSchema,
  consumerWithdrawalEventRowsSchema,
  consumerWithdrawalOrderItemRowsSchema,
  consumerWithdrawalRowSchema,
  consumerWithdrawalReturnItemRowsSchema,
  consumerWithdrawalSettlementSchema,
} from '../schemas/consumer-withdrawals.schema.js'
import type {
  ConsumerWithdrawalActionType,
  IConsumerWithdrawalEventDto,
  IConsumerWithdrawalListFilters,
  IConsumerWithdrawalOrderCandidateDto,
  IConsumerWithdrawalRecord,
  IConsumerWithdrawalReturnItemDto,
  IConsumerWithdrawalReturnItemInput,
} from '../types/consumer-withdrawals.js'
import { AppError, RepositoryError } from '../utils/app-error.js'
import { escapePostgrestLikePattern } from '../utils/postgrest-pattern.js'

interface ICreateInput {
  actorProfileId?: string | undefined
  comment: string | null
  contactFingerprint: string
  idempotencyKeyHash: string
  ipFingerprint: string | null
  orderReference: string | null
  orderReferenceUnavailable: boolean
  payloadFingerprint: string
  phoneNormalized: string
  publicCodeHash: string
  publicCodeSuffix: string
  source: 'admin_whatsapp_contingency' | 'web'
  submittedAt: string | null
}

interface ITransitionInput {
  action: ConsumerWithdrawalActionType
  actorProfileId: string
  expectedVersion: number
  idempotencyExpiresAt: string
  idempotencyKeyHash: string
  payloadFingerprint: string
  publicExplanation: string | null
  reason: string | null
  requestId: string
}

interface IInspectReturnInput {
  actorProfileId: string
  expectedVersion: number
  idempotencyExpiresAt: string
  idempotencyKeyHash: string
  items: readonly IConsumerWithdrawalReturnItemInput[]
  payloadFingerprint: string
  reason: string
  requestId: string
}

interface ILinkInput {
  actorProfileId: string
  expectedVersion: number
  idempotencyExpiresAt: string
  idempotencyKeyHash: string
  note: string
  orderId: string
  payloadFingerprint: string
  requestId: string
}

interface ISettlementInput {
  actorProfileId: string
  contractRefundAmount: number
  expectedVersion: number
  idempotencyExpiresAt: string
  idempotencyKeyHash: string
  method: 'bank_transfer' | 'cash'
  notes: string | null
  payloadFingerprint: string
  reference: string
  requestId: string
  returnShippingRefundAmount: number
}

interface ISettlementCorrectionInput {
  actorProfileId: string
  confirmedTotalRefundAmount: number
  expectedVersion: number
  idempotencyExpiresAt: string
  idempotencyKeyHash: string
  payloadFingerprint: string
  reason: string
  requestId: string
  returnShippingRefundAmount: number
}

interface IOrderRefundSnapshot {
  contractConcludedAt: string | null
  deliveredAt: string | null
  deliveryMethod: 'pickup' | 'shipping'
  method: 'bank_transfer' | 'cash'
  orderNumber: string
  paymentStatus: 'paid' | 'pending' | 'rejected'
  pickedUpAt: string | null
  status: string
  total: number
}

export interface IConsumerWithdrawalSettlementSnapshot {
  contractAmount: number
  originalShippingAmount: number
  returnShippingAmount: number
  totalAmount: number
}

interface IConsumerWithdrawalPage {
  items: readonly IConsumerWithdrawalRecord[]
  totalItems: number
}

export interface IConsumerWithdrawalAttemptLimit {
  captchaRequired: boolean
  isBlocked: boolean
  retryAfterSeconds: number
}

interface IDatabaseTable<Row extends Record<string, unknown>> {
  Insert: Partial<Row>
  Relationships: []
  Row: Row
  Update: Partial<Row>
}

type WithdrawalRow = Record<string, unknown>

interface IWithdrawalDatabase {
  public: {
    CompositeTypes: Record<string, never>
    Enums: Record<string, never>
    Functions: {
      correct_consumer_withdrawal_settlement: {
        Args: {
          p_actor_profile_id: string
          p_confirmed_total_refund_amount: number
          p_expected_version: number
          p_idempotency_expires_at: string
          p_idempotency_key_hash: string
          p_payload_fingerprint: string
          p_reason: string
          p_request_id: string
          p_return_shipping_refund_amount: number
        }
        Returns: boolean
      }
      create_consumer_withdrawal: {
        Args: {
          p_actor_profile_id: string | null
          p_contact_fingerprint: string
          p_contact_phone_normalized: string
          p_customer_comment: string | null
          p_idempotency_key_hash: string
          p_order_reference_input: string | null
          p_order_reference_unavailable: boolean
          p_payload_fingerprint: string
          p_public_code_hash: string
          p_public_code_key_version: number
          p_public_code_suffix: string
          p_source: string
          p_idempotency_expires_at: string
          p_submitted_at: string | null
        }
        Returns: {
          acknowledgement_issued_at: string
          created: boolean
          request_status: string
          submitted_at: string
          withdrawal_request_id: string
        }[]
      }
      link_consumer_withdrawal_order: {
        Args: {
          p_actor_profile_id: string
          p_expected_version: number
          p_idempotency_expires_at: string
          p_idempotency_key_hash: string
          p_reason: string
          p_order_id: string
          p_payload_fingerprint: string
          p_request_id: string
        }
        Returns: boolean
      }
      inspect_consumer_withdrawal_return: {
        Args: {
          p_actor_profile_id: string
          p_expected_version: number
          p_idempotency_expires_at: string
          p_idempotency_key_hash: string
          p_items: unknown
          p_payload_fingerprint: string
          p_reason: string
          p_request_id: string
        }
        Returns: boolean
      }
      record_consumer_withdrawal_settlement: {
        Args: {
          p_actor_profile_id: string
          p_complete: boolean
          p_contract_refund_amount: number
          p_expected_version: number
          p_idempotency_expires_at: string
          p_idempotency_key_hash: string
          p_method: string
          p_notes: string | null
          p_original_shipping_refund_amount: number
          p_payload_fingerprint: string
          p_reference: string
          p_request_id: string
          p_return_shipping_refund_amount: number
        }
        Returns: boolean
      }
      register_consumer_withdrawal_attempt: {
        Args: {
          p_block_duration: string
          p_captcha_threshold: number
          p_contact_fingerprint: string
          p_expires_at: string
          p_ip_fingerprint: string
          p_max_attempts: number
          p_window: string
        }
        Returns: {
          captcha_required: boolean
          is_blocked: boolean
          retry_after_seconds: number
        }[]
      }
      transition_consumer_withdrawal: {
        Args: {
          p_action: string
          p_actor_profile_id: string
          p_expected_version: number
          p_idempotency_expires_at: string
          p_idempotency_key_hash: string
          p_payload_fingerprint: string
          p_reason: string | null
          p_public_explanation: string | null
          p_request_id: string
        }
        Returns: boolean
      }
    }
    Tables: {
      consumer_withdrawal_events: IDatabaseTable<WithdrawalRow>
      consumer_withdrawal_requests: IDatabaseTable<WithdrawalRow>
      consumer_withdrawal_return_items: IDatabaseTable<WithdrawalRow>
      consumer_withdrawal_settlements: IDatabaseTable<WithdrawalRow>
      order_items: IDatabaseTable<WithdrawalRow>
      orders: IDatabaseTable<WithdrawalRow>
    }
    Views: Record<string, never>
  }
}

const REQUEST_SELECT = `
  id,public_code_suffix,order_id,order_reference_input,order_reference_unavailable,
  contact_phone_normalized,request_status,return_status,refund_status,version,
  customer_comment,resolution_reason,public_resolution_explanation,source,submitted_at,acknowledgement_issued_at,
  legal_time_status,legal_time_basis,legal_deadline_at,first_review_due_at,orders(id,order_number),
  first_reviewed_at,applicable_at,not_applicable_at,closed_at,created_at,updated_at
`

function mapRecord(row: unknown): IConsumerWithdrawalRecord {
  const parsed = consumerWithdrawalRowSchema.safeParse(row)
  if (!parsed.success) throw new RepositoryError('La solicitud devolvió un formato inválido')
  const value = parsed.data
  return {
    acknowledgementIssuedAt: value.acknowledgement_issued_at,
    applicableAt: value.applicable_at,
    closedAt: value.closed_at,
    contactPhoneNormalized: value.contact_phone_normalized,
    createdAt: value.created_at,
    customerComment: value.customer_comment,
    firstReviewDueAt: value.first_review_due_at,
    firstReviewedAt: value.first_reviewed_at,
    id: value.id,
    legalDeadlineAt: value.legal_deadline_at,
    legalTimeBasis: value.legal_time_basis,
    legalTimeStatus: value.legal_time_status,
    notApplicableAt: value.not_applicable_at,
    orderId: value.order_id,
    orderNumber: value.orders?.order_number ?? null,
    orderReferenceInput: value.order_reference_input,
    orderReferenceUnavailable: value.order_reference_unavailable,
    publicCodeSuffix: value.public_code_suffix,
    publicExplanation: value.public_resolution_explanation,
    refundStatus: value.refund_status,
    requestStatus: value.request_status,
    resolutionReason: value.resolution_reason,
    returnStatus: value.return_status,
    source: value.source,
    submittedAt: value.submitted_at,
    updatedAt: value.updated_at,
    version: value.version,
  }
}

function mapRpcError(error: PostgrestError): AppError {
  if (error.code === '23505') {
    return new AppError(409, 'La clave de idempotencia ya fue utilizada con otros datos', 'IDEMPOTENCY_CONFLICT')
  }
  if (error.code === '40001') {
    return new AppError(409, 'La solicitud cambió mientras la revisabas', 'WITHDRAWAL_UPDATE_CONFLICT')
  }
  if (error.code === '23514' || error.code === '22023') {
    if (error.message === 'Return items are required'
      || error.message === 'Every order item must be resolved exactly once') {
      return new AppError(409, 'Debés clasificar todos los productos recibidos', 'WITHDRAWAL_RETURN_ITEMS_REQUIRED')
    }
    if (error.message === 'Returned quantities do not match the order') {
      return new AppError(409, 'Las cantidades no coinciden con las unidades vendidas', 'WITHDRAWAL_RETURN_QUANTITIES_INVALID')
    }
    if (error.message === 'Returned stock must be resolved before inspection or closure') {
      return new AppError(409, 'El stock de la devolución todavía no está resuelto', 'WITHDRAWAL_RETURN_STOCK_UNRESOLVED')
    }
    return new AppError(409, 'La acción ya no está disponible', 'WITHDRAWAL_ACTION_NOT_ALLOWED')
  }
  if (error.code === '42501') {
    if (error.message === 'An active administrator is required') {
      return new AppError(403, 'No tenés permiso para gestionar solicitudes', 'ADMIN_FORBIDDEN')
    }
    return new RepositoryError('No fue posible completar la operación por un problema de configuración')
  }
  return new RepositoryError('No fue posible gestionar la solicitud')
}

const DB_ACTIONS: Readonly<Record<ConsumerWithdrawalActionType, string>> = {
  close: 'close',
  confirmManualRefund: 'confirm_manual_refund',
  correctManualRefund: 'correct_manual_refund',
  determineApplicable: 'determine_applicable',
  determineNotApplicable: 'determine_not_applicable',
  inspectReturn: 'inspect_return',
  markRefundManualReview: 'mark_refund_manual_review',
  markRefundProcessing: 'mark_refund_processing',
  receiveReturn: 'record_return_received',
  requestVerification: 'request_verification',
  startReview: 'start_review',
}

export interface IConsumerWithdrawalRepository {
  correctSettlement(input: ISettlementCorrectionInput): Promise<void>
  create(input: ICreateInput): Promise<IConsumerWithdrawalRecord>
  findById(requestId: string): Promise<IConsumerWithdrawalRecord | null>
  findByPublicCodeHash(publicCodeHash: string): Promise<IConsumerWithdrawalRecord | null>
  findEvents(requestId: string): Promise<readonly IConsumerWithdrawalEventDto[]>
  findOrderCandidates(phoneNormalized: string): Promise<readonly IConsumerWithdrawalOrderCandidateDto[]>
  findOrderRefundSnapshot(orderId: string): Promise<IOrderRefundSnapshot | null>
  findReturnItems(
    requestId: string,
    orderId: string,
  ): Promise<readonly IConsumerWithdrawalReturnItemDto[]>
  findSettlement(requestId: string): Promise<IConsumerWithdrawalSettlementSnapshot | null>
  findPage(filters: IConsumerWithdrawalListFilters): Promise<IConsumerWithdrawalPage>
  linkOrder(input: ILinkInput): Promise<void>
  inspectReturn(input: IInspectReturnInput): Promise<void>
  recordSettlement(input: ISettlementInput): Promise<void>
  registerAttempt(
    ipFingerprint: string,
    contactFingerprint: string,
    config: {
      blockDurationMs: number
      captchaThreshold: number
      maxAttempts: number
      windowMs: number
    },
  ): Promise<IConsumerWithdrawalAttemptLimit>
  transition(input: ITransitionInput): Promise<void>
}

export class ConsumerWithdrawalRepository implements IConsumerWithdrawalRepository {
  private readonly database: SupabaseClient<IWithdrawalDatabase>

  public constructor(client: ServerSupabaseClient) {
    this.database = client as unknown as SupabaseClient<IWithdrawalDatabase>
  }

  public async create(input: ICreateInput): Promise<IConsumerWithdrawalRecord> {
    const { data, error } = await this.database.rpc('create_consumer_withdrawal', {
      p_actor_profile_id: input.actorProfileId ?? null,
      p_contact_fingerprint: input.contactFingerprint,
      p_contact_phone_normalized: input.phoneNormalized,
      p_customer_comment: input.comment,
      p_idempotency_key_hash: input.idempotencyKeyHash,
      p_order_reference_input: input.orderReference,
      p_order_reference_unavailable: input.orderReferenceUnavailable,
      p_payload_fingerprint: input.payloadFingerprint,
      p_public_code_hash: input.publicCodeHash,
      p_public_code_key_version: 1,
      p_public_code_suffix: input.publicCodeSuffix,
      p_source: input.source,
      p_idempotency_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      p_submitted_at: input.submittedAt,
    })
    if (error !== null) throw mapRpcError(error)
    const result = Array.isArray(data) ? data[0] : data
    if (result === undefined || result === null) {
      throw new RepositoryError('La solicitud no devolvió su constancia')
    }
    const row = await this.findById(result.withdrawal_request_id)
    if (row === null) throw new RepositoryError('No fue posible recuperar la solicitud creada')
    return row
  }

  public async findByPublicCodeHash(hash: string): Promise<IConsumerWithdrawalRecord | null> {
    const { data, error } = await this.database.from('consumer_withdrawal_requests')
      .select(REQUEST_SELECT).eq('public_code_hash', `\\x${hash}`).maybeSingle()
    if (error !== null) throw new RepositoryError('No fue posible consultar la solicitud')
    return data === null ? null : mapRecord(data)
  }

  public async findById(requestId: string): Promise<IConsumerWithdrawalRecord | null> {
    const { data, error } = await this.database.from('consumer_withdrawal_requests')
      .select(REQUEST_SELECT).eq('id', requestId).maybeSingle()
    if (error !== null) throw new RepositoryError('No fue posible consultar la solicitud')
    return data === null ? null : mapRecord(data)
  }

  public async findPage(filters: IConsumerWithdrawalListFilters): Promise<IConsumerWithdrawalPage> {
    let query = this.database.from('consumer_withdrawal_requests')
      .select(REQUEST_SELECT, { count: 'exact' })
    if (filters.status !== 'all') query = query.eq('request_status', filters.status)
    if (filters.linkage === 'linked') query = query.not('order_id', 'is', null)
    if (filters.linkage === 'unlinked') query = query.is('order_id', null)
    if (filters.compliance === 'attention') {
      query = query.or(`legal_time_status.eq.review_required,first_review_due_at.lt.${new Date().toISOString()}`)
    }
    if (filters.compliance === 'on_time') {
      query = query.neq('legal_time_status', 'review_required')
        .gte('first_review_due_at', new Date().toISOString())
    }
    if (filters.search !== undefined) {
      const escaped = escapePostgrestLikePattern(filters.search).replace(/"/g, '\\"')
      query = query.or(`public_code_suffix.ilike."%${escaped}%",order_reference_input.ilike."%${escaped}%",contact_phone_normalized.ilike."%${escaped}%"`)
    }
    const first = (filters.page - 1) * filters.pageSize
    const { count, data, error } = await query
      .order(filters.sort === 'urgent' ? 'first_review_due_at' : 'submitted_at', {
        ascending: filters.sort !== 'newest',
      })
      .order('id', { ascending: true }).range(first, first + filters.pageSize - 1)
    if (error !== null || count === null) throw new RepositoryError('No fue posible listar las solicitudes')
    return { items: (data ?? []).map(mapRecord), totalItems: count }
  }

  public async findEvents(requestId: string): Promise<readonly IConsumerWithdrawalEventDto[]> {
    const { data, error } = await this.database.from('consumer_withdrawal_events')
      .select('id,actor_profile_id,event_type,previous_status,next_status,reason,created_at')
      .eq('withdrawal_request_id', requestId).order('created_at', { ascending: true })
    if (error !== null) throw new RepositoryError('No fue posible consultar el historial')
    const parsed = consumerWithdrawalEventRowsSchema.safeParse(data)
    if (!parsed.success) throw new RepositoryError('El historial devolvió un formato inválido')
    return parsed.data.map((event) => ({
      actorLabel: event.actor_profile_id === null ? 'Sistema' : 'Administración',
      createdAt: event.created_at,
      description: event.reason ?? event.event_type.replace(/_/g, ' '),
      id: event.id,
      type: event.event_type,
    }))
  }

  public async findOrderCandidates(phoneNormalized: string): Promise<readonly IConsumerWithdrawalOrderCandidateDto[]> {
    const { data, error } = await this.database.from('orders')
      .select('id,order_number,created_at,status,total,delivery_method,payment_method,order_items(product_name,quantity)')
      .eq('customer_phone_normalized', phoneNormalized).order('created_at', { ascending: false }).limit(20)
    if (error !== null) throw new RepositoryError('No fue posible buscar pedidos candidatos')
    const parsed = consumerWithdrawalCandidateRowsSchema.safeParse(data)
    if (!parsed.success) throw new RepositoryError('Los pedidos candidatos devolvieron un formato inválido')
    return parsed.data.map((order) => ({
      createdAt: order.created_at,
      deliveryMethod: order.delivery_method,
      id: order.id,
      itemSummary: order.order_items.map((item) => `${item.quantity} × ${item.product_name}`).join(', '),
      orderNumber: order.order_number,
      paymentMethod: order.payment_method,
      status: order.status,
      total: order.total,
    }))
  }

  public async findOrderRefundSnapshot(orderId: string): Promise<IOrderRefundSnapshot | null> {
    const { data, error } = await this.database.from('orders')
      .select(`
        order_number,
        status,
        payment_status,
        total,
        payment_method,
        delivery_method,
        contract_concluded_at,
        picked_up_at,
        delivered_at
      `)
      .eq('id', orderId).maybeSingle()
    if (error !== null) throw new RepositoryError('No fue posible calcular el reintegro')
    if (data === null) return null
    const total = Number(data.total)
    const method = data.payment_method
    if (
      !Number.isFinite(total)
      || total < 0
      || !['bank_transfer', 'cash'].includes(String(method))
      || !['pickup', 'shipping'].includes(String(data.delivery_method))
      || !['paid', 'pending', 'rejected'].includes(String(data.payment_status))
      || (data.contract_concluded_at !== null && typeof data.contract_concluded_at !== 'string')
      || (data.delivered_at !== null && typeof data.delivered_at !== 'string')
      || (data.picked_up_at !== null && typeof data.picked_up_at !== 'string')
    ) {
      throw new RepositoryError('El pedido devolvió datos de reintegro inválidos')
    }
    return {
      contractConcludedAt: data.contract_concluded_at,
      deliveredAt: data.delivered_at,
      deliveryMethod: data.delivery_method as 'pickup' | 'shipping',
      method: method as 'bank_transfer' | 'cash',
      orderNumber: String(data.order_number),
      paymentStatus: data.payment_status as 'paid' | 'pending' | 'rejected',
      pickedUpAt: data.picked_up_at,
      status: String(data.status),
      total,
    }
  }

  public async findSettlement(requestId: string): Promise<IConsumerWithdrawalSettlementSnapshot | null> {
    const { data, error } = await this.database.from('consumer_withdrawal_settlements')
      .select('contract_refund_amount,original_shipping_refund_amount,return_shipping_refund_amount,total_refund_amount')
      .eq('withdrawal_request_id', requestId).maybeSingle()
    if (error !== null) throw new RepositoryError('No fue posible consultar la liquidación')
    const parsed = consumerWithdrawalSettlementSchema.safeParse(data)
    if (!parsed.success) throw new RepositoryError('La liquidación devolvió un formato inválido')
    if (parsed.data === null) return null
    return {
      contractAmount: parsed.data.contract_refund_amount,
      originalShippingAmount: parsed.data.original_shipping_refund_amount,
      returnShippingAmount: parsed.data.return_shipping_refund_amount,
      totalAmount: parsed.data.total_refund_amount,
    }
  }

  public async findReturnItems(
    requestId: string,
    orderId: string,
  ): Promise<readonly IConsumerWithdrawalReturnItemDto[]> {
    const [orderItemsResult, returnItemsResult] = await Promise.all([
      this.database.from('order_items')
        .select('id,product_name,quantity')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
      this.database.from('consumer_withdrawal_return_items')
        .select('order_item_id,ordered_quantity,restockable_quantity,non_restockable_quantity')
        .eq('withdrawal_request_id', requestId),
    ])
    if (orderItemsResult.error !== null || returnItemsResult.error !== null) {
      throw new RepositoryError('No fue posible consultar la inspección de la devolución')
    }
    const orderItems = consumerWithdrawalOrderItemRowsSchema.safeParse(orderItemsResult.data)
    const returnItems = consumerWithdrawalReturnItemRowsSchema.safeParse(returnItemsResult.data)
    if (!orderItems.success || !returnItems.success) {
      throw new RepositoryError('La inspección de la devolución devolvió datos inválidos')
    }
    return orderItems.data.map((item) => {
      const resolution = returnItems.data.find((candidate) => candidate.order_item_id === item.id)
      return {
        nonRestockableQuantity: resolution?.non_restockable_quantity ?? null,
        orderItemId: item.id,
        orderedQuantity: item.quantity,
        productName: item.product_name,
        restockableQuantity: resolution?.restockable_quantity ?? null,
      }
    })
  }

  public async inspectReturn(input: IInspectReturnInput): Promise<void> {
    const { data, error } = await this.database.rpc('inspect_consumer_withdrawal_return', {
      p_actor_profile_id: input.actorProfileId,
      p_expected_version: input.expectedVersion,
      p_idempotency_expires_at: input.idempotencyExpiresAt,
      p_idempotency_key_hash: input.idempotencyKeyHash,
      p_items: input.items.map((item) => ({
        non_restockable_quantity: item.nonRestockableQuantity,
        order_item_id: item.orderItemId,
        restockable_quantity: item.restockableQuantity,
      })),
      p_payload_fingerprint: input.payloadFingerprint,
      p_reason: input.reason,
      p_request_id: input.requestId,
    })
    if (error !== null) throw mapRpcError(error)
    if (!data) throw new AppError(404, 'Solicitud no encontrada', 'WITHDRAWAL_NOT_FOUND')
  }

  public async transition(input: ITransitionInput): Promise<void> {
    const { data, error } = await this.database.rpc('transition_consumer_withdrawal', {
      p_action: DB_ACTIONS[input.action],
      p_actor_profile_id: input.actorProfileId,
      p_expected_version: input.expectedVersion,
      p_idempotency_expires_at: input.idempotencyExpiresAt,
      p_idempotency_key_hash: input.idempotencyKeyHash,
      p_payload_fingerprint: input.payloadFingerprint,
      p_reason: input.reason,
      p_public_explanation: input.publicExplanation,
      p_request_id: input.requestId,
    })
    if (error !== null) throw mapRpcError(error)
    if (!data) throw new AppError(404, 'Solicitud no encontrada', 'WITHDRAWAL_NOT_FOUND')
  }

  public async linkOrder(input: ILinkInput): Promise<void> {
    const { data, error } = await this.database.rpc('link_consumer_withdrawal_order', {
      p_actor_profile_id: input.actorProfileId,
      p_expected_version: input.expectedVersion,
      p_idempotency_expires_at: input.idempotencyExpiresAt,
      p_idempotency_key_hash: input.idempotencyKeyHash,
      p_reason: input.note,
      p_order_id: input.orderId,
      p_payload_fingerprint: input.payloadFingerprint,
      p_request_id: input.requestId,
    })
    if (error !== null) throw mapRpcError(error)
    if (!data) throw new AppError(404, 'Solicitud o pedido no encontrado', 'WITHDRAWAL_LINK_NOT_FOUND')
  }

  public async recordSettlement(input: ISettlementInput): Promise<void> {
    const { data, error } = await this.database.rpc('record_consumer_withdrawal_settlement', {
      p_actor_profile_id: input.actorProfileId,
      p_complete: true,
      p_contract_refund_amount: input.contractRefundAmount,
      p_expected_version: input.expectedVersion,
      p_idempotency_expires_at: input.idempotencyExpiresAt,
      p_idempotency_key_hash: input.idempotencyKeyHash,
      p_method: input.method,
      p_notes: input.notes,
      p_original_shipping_refund_amount: 0,
      p_payload_fingerprint: input.payloadFingerprint,
      p_reference: input.reference,
      p_request_id: input.requestId,
      p_return_shipping_refund_amount: input.returnShippingRefundAmount,
    })
    if (error !== null) throw mapRpcError(error)
    if (!data) throw new AppError(404, 'Solicitud no encontrada', 'WITHDRAWAL_NOT_FOUND')
  }

  public async correctSettlement(input: ISettlementCorrectionInput): Promise<void> {
    const { data, error } = await this.database.rpc('correct_consumer_withdrawal_settlement', {
      p_actor_profile_id: input.actorProfileId,
      p_confirmed_total_refund_amount: input.confirmedTotalRefundAmount,
      p_expected_version: input.expectedVersion,
      p_idempotency_expires_at: input.idempotencyExpiresAt,
      p_idempotency_key_hash: input.idempotencyKeyHash,
      p_payload_fingerprint: input.payloadFingerprint,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_return_shipping_refund_amount: input.returnShippingRefundAmount,
    })
    if (error !== null) throw mapRpcError(error)
    if (!data) throw new AppError(404, 'Solicitud no encontrada', 'WITHDRAWAL_NOT_FOUND')
  }

  public async registerAttempt(
    ipFingerprint: string,
    contactFingerprint: string,
    config: {
      blockDurationMs: number
      captchaThreshold: number
      maxAttempts: number
      windowMs: number
    },
  ): Promise<IConsumerWithdrawalAttemptLimit> {
    const { data, error } = await this.database.rpc('register_consumer_withdrawal_attempt', {
      p_block_duration: `${config.blockDurationMs} milliseconds`,
      p_captcha_threshold: config.captchaThreshold,
      p_contact_fingerprint: contactFingerprint,
      p_expires_at: new Date(Date.now() + config.blockDurationMs + config.windowMs).toISOString(),
      p_ip_fingerprint: ipFingerprint,
      p_max_attempts: config.maxAttempts,
      p_window: `${config.windowMs} milliseconds`,
    })
    if (error !== null) throw mapRpcError(error)
    const limit = Array.isArray(data) ? data[0] : data
    if (limit === undefined || limit === null) {
      throw new RepositoryError('No fue posible aplicar la protección antiabuso')
    }
    return {
      captchaRequired: limit.captcha_required,
      isBlocked: limit.is_blocked,
      retryAfterSeconds: limit.retry_after_seconds,
    }
  }
}
