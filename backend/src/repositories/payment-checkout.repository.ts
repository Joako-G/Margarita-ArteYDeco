import type { Logger } from 'pino'

import type { ServerSupabaseClient } from '../config/supabase.js'
import type { CreatedPaymentPreference, OrderPaymentSnapshot } from '../payments/types.js'
import { AppError, RepositoryError } from '../utils/app-error.js'
import { z } from 'zod'

const initializationRowSchema = z.object({
  order_id: z.uuid(),
  attempt_id: z.uuid(),
  reservation_expires_at: z.iso.datetime({ offset: true }),
})

const snapshotSchema = z.object({
  id: z.uuid(),
  order_id: z.uuid(),
  amount: z.coerce.number().positive(),
  external_reference: z.string().min(1),
  reservation_expires_at: z.iso.datetime({ offset: true }),
  orders: z.object({
    order_number: z.string().min(1),
    order_items: z.array(z.object({
      product_name: z.string().trim().min(1),
      quantity: z.coerce.number().int().positive(),
      unit_price: z.coerce.number().positive(),
    })).min(1),
  }),
}).superRefine((value, context) => {
  const itemsAmount = value.orders.order_items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  if (Math.round(itemsAmount * 100) !== Math.round(value.amount * 100)) {
    context.addIssue({ code: 'custom', message: 'Payment snapshot amount does not match its item snapshots' })
  }
})

const PAYMENT_INITIALIZATION_OPERATION = 'create_order_with_payment_v2'
const PROVIDER_PREFERENCE_OPERATION = 'record_provider_preference'
const PROVIDER_OUTBOX_OPERATION = 'record_provider_outbox'
const PROVIDER_FAILURE_OPERATION = 'record_provider_failure'
const SNAPSHOT_OPERATION = 'find_payment_snapshot'
const MAX_DATABASE_MESSAGE_LENGTH = 200

function sanitizeDatabaseMessage(message: unknown): string | undefined {
  if (typeof message !== 'string') return undefined

  const normalized = [...message]
    .map((character) => character.codePointAt(0)! < 32 || character.codePointAt(0)! === 127 ? ' ' : character)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  if (
    normalized.length === 0 ||
    /access[_ -]?token|authorization|bearer|cookie|customer|email|password|phone|secret|token|url|https?:\/\/|request[_ -]?body|select\s|insert\s|update\s|delete\s|from\s|where\s|postgres(?:ql)?/i.test(normalized) ||
    /\b\d{7,}\b/.test(normalized)
  ) return undefined

  return normalized.slice(0, MAX_DATABASE_MESSAGE_LENGTH)
}

function mapInitializationError(code: string | undefined): AppError {
  switch (code) {
    case '23505':
      return new AppError(409, 'La clave de idempotencia ya fue utilizada', 'IDEMPOTENCY_CONFLICT')
    case 'P0001':
      return new AppError(409, 'El producto no está disponible o no hay stock suficiente', 'PRODUCT_UNAVAILABLE')
    case '23514':
      return new AppError(400, 'Los datos del pedido no son válidos', 'INVALID_ORDER')
    case '22023':
      return new AppError(400, 'Los datos enviados no son válidos', 'VALIDATION_ERROR')
    default:
      return new RepositoryError('No fue posible iniciar el pago')
  }
}

function logPersistenceError(logger: Logger, operation: string, error: { code?: string; message?: unknown }): void {
  const diagnosticMessage = sanitizeDatabaseMessage(error.message)
  logger.error({
    code: error.code ?? 'UNKNOWN',
    ...(diagnosticMessage === undefined ? {} : { message: diagnosticMessage }),
    operation,
  }, 'Payment provider persistence failed')
}

export interface PaymentCheckoutInitialization {
  orderId: string
  attemptId: string
  reservationExpiresAt: Date
}

export interface ResumablePaymentAttempt {
  providerPreferenceId: string
  reservationExpiresAt: Date
  status: 'pending' | 'rejected'
}

export interface LatestPaymentAttempt {
  reservationExpiresAt: Date
  status: 'pending' | 'in_process' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'manual_review'
}

function resolveLatestAttemptStatus(
  status: LatestPaymentAttempt['status'],
  amount: number,
  transactions: readonly { amount: number; review_required: boolean; status: string }[],
): LatestPaymentAttempt['status'] {
  const approvedAmount = transactions
    .filter((transaction) => transaction.status === 'approved')
    .reduce((total, transaction) => total + Number(transaction.amount), 0)
  const hasReview = transactions.some((transaction) => transaction.review_required || transaction.status === 'manual_review')
  const hasOverpayment = approvedAmount > amount
  if (!hasReview && !hasOverpayment && Math.round(approvedAmount * 100) === Math.round(amount * 100)) return 'approved'
  return status
}

export interface IPaymentCheckoutRepository {
  initialize(
    sessionId: string,
    input: Record<string, unknown>,
  ): Promise<PaymentCheckoutInitialization>
  findSnapshot(attemptId: string): Promise<OrderPaymentSnapshot>
  findResumableAttempt?(orderId: string, now: Date): Promise<ResumablePaymentAttempt | null>
  findLatestAttempt?(orderId: string): Promise<LatestPaymentAttempt | null>
  recordProviderPreference(
    attemptId: string,
    idempotencyKey: string,
    result: CreatedPaymentPreference,
  ): Promise<void>
  scheduleReconciliation?(attemptId: string, runAt: Date): Promise<void>
  recordProviderFailure(attemptId: string, message: string, status?: 'pending' | 'manual_review'): Promise<void>
}

export class PaymentCheckoutRepository implements IPaymentCheckoutRepository {
  public constructor(
    private readonly client: ServerSupabaseClient,
    private readonly logger: Logger,
  ) {}

  public async initialize(
    sessionId: string,
    input: Record<string, unknown>,
  ): Promise<PaymentCheckoutInitialization> {
    const { data, error } = await this.client.rpc('create_order_with_payment_v2', {
      ...input,
      p_guest_session_id: sessionId,
    } as never)

    if (error !== null) {
      const diagnosticMessage = sanitizeDatabaseMessage(error.message)
      this.logger.error({
        code: error.code ?? 'UNKNOWN',
        ...(diagnosticMessage === undefined ? {} : { message: diagnosticMessage }),
        operation: PAYMENT_INITIALIZATION_OPERATION,
      }, 'Payment checkout initialization RPC failed')
      throw mapInitializationError(error.code)
    }

    const parsed = initializationRowSchema.safeParse(data?.[0])
    if (!parsed.success) {
      throw new RepositoryError('La inicialización del pago devolvió un formato inválido')
    }

    return {
      attemptId: parsed.data.attempt_id,
      orderId: parsed.data.order_id,
      reservationExpiresAt: new Date(parsed.data.reservation_expires_at),
    }
  }

  public async findSnapshot(attemptId: string): Promise<OrderPaymentSnapshot> {
    const { data, error } = await this.client
      .from('payment_attempts')
      .select('id, order_id, amount, external_reference, reservation_expires_at, orders(order_number, order_items(product_name, quantity, unit_price))')
      .eq('id', attemptId)
      .maybeSingle()

    if (error !== null) {
      const diagnosticMessage = sanitizeDatabaseMessage(error.message)
      this.logger.error({
        code: error.code ?? 'UNKNOWN',
        ...(diagnosticMessage === undefined ? {} : { message: diagnosticMessage }),
        operation: SNAPSHOT_OPERATION,
      }, 'Payment snapshot query failed')
      throw new RepositoryError('No fue posible obtener el intento de pago')
    }

    if (data === null) {
      this.logger.warn({ operation: SNAPSHOT_OPERATION, diagnostic: 'empty_result' }, 'Payment snapshot query returned no result')
      throw new RepositoryError('No fue posible obtener el intento de pago')
    }

    const parsed = snapshotSchema.safeParse(data)
    if (!parsed.success) {
      this.logger.error({ diagnostic: 'invalid_snapshot_shape', operation: SNAPSHOT_OPERATION }, 'Payment snapshot shape is invalid')
      throw new RepositoryError('El intento de pago devolvió un formato inválido')
    }

    return {
      amount: parsed.data.amount,
      attemptId: parsed.data.id,
      items: parsed.data.orders.order_items.map((item) => ({
        currency: 'ARS',
        quantity: item.quantity,
        title: item.product_name,
        unitPrice: item.unit_price,
      })),
      orderId: parsed.data.order_id,
      orderNumber: parsed.data.orders.order_number,
    }
  }

  public async findResumableAttempt(orderId: string, now: Date): Promise<ResumablePaymentAttempt | null> {
    const { data, error } = await this.client
      .from('payment_attempts')
      .select('provider_preference_id, reservation_expires_at, status')
      .eq('order_id', orderId)
      .in('status', ['pending', 'rejected'])
      .not('provider_preference_id', 'is', null)
      .gt('reservation_expires_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error !== null) {
      logPersistenceError(this.logger, 'find_resumable_payment_attempt', error)
      throw new RepositoryError('No fue posible consultar el pago')
    }

    if (data === null || typeof data.provider_preference_id !== 'string') return null

    const reservationExpiresAt = new Date(data.reservation_expires_at)
    if (Number.isNaN(reservationExpiresAt.getTime())) {
      this.logger.error({ diagnostic: 'invalid_reservation_expiry', operation: 'find_resumable_payment_attempt' }, 'Payment reservation shape is invalid')
      throw new RepositoryError('El estado de la reserva no es válido')
    }

    return {
      providerPreferenceId: data.provider_preference_id,
      reservationExpiresAt,
      status: data.status as 'pending' | 'rejected',
    }
  }

  public async findLatestAttempt(orderId: string): Promise<LatestPaymentAttempt | null> {
    const { data, error } = await this.client
      .from('payment_attempts')
      .select('amount, reservation_expires_at, status, payment_transactions(amount, status, review_required)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error !== null) {
      logPersistenceError(this.logger, 'find_latest_payment_attempt', error)
      throw new RepositoryError('No fue posible consultar el pago')
    }

    if (data === null) return null

    const reservationExpiresAt = new Date(data.reservation_expires_at)
    if (Number.isNaN(reservationExpiresAt.getTime())) {
      throw new RepositoryError('El estado de la reserva no es válido')
    }

    return {
      reservationExpiresAt,
      status: resolveLatestAttemptStatus(
        data.status,
        Number(data.amount),
        Array.isArray(data.payment_transactions) ? data.payment_transactions : [],
      ),
    }
  }

  public async recordProviderPreference(
    attemptId: string,
    idempotencyKey: string,
    result: CreatedPaymentPreference,
  ): Promise<void> {
    const { error } = await this.client
      .from('payment_attempts')
      .update({ provider_preference_id: result.providerPreferenceId, provider_status: result.providerStatus })
      .eq('id', attemptId)

    if (error !== null) {
      logPersistenceError(this.logger, PROVIDER_PREFERENCE_OPERATION, error)
      throw new RepositoryError('No fue posible guardar el pago')
    }

    const outboxResult = await this.client
      .from('payment_outbox')
      .update({ status: 'succeeded' })
      .eq('attempt_id', attemptId)

    if (outboxResult.error !== null) {
      logPersistenceError(this.logger, PROVIDER_OUTBOX_OPERATION, outboxResult.error)
      throw new RepositoryError('No fue posible cerrar el despacho del pago')
    }

    if (typeof (this as IPaymentCheckoutRepository).scheduleReconciliation === 'function') {
      await this.scheduleReconciliation(attemptId, new Date(Date.now() + 60_000))
    }
  }

  public async scheduleReconciliation(attemptId: string, runAt: Date): Promise<void> {
    const { error } = await this.client.rpc('enqueue_payment_reconciliation_v2', {
      p_attempt_id: attemptId,
      p_run_at: runAt.toISOString(),
    })
    if (error !== null) throw new RepositoryError('No fue posible programar la conciliación de pago')
  }

  public async recordProviderFailure(attemptId: string, message: string, status: 'pending' | 'manual_review' = 'pending'): Promise<void> {
    const { error } = await this.client
      .from('payment_attempts')
      .update({
        last_error: message.slice(0, 500),
        ...(status === 'manual_review' ? { status: 'manual_review' as const } : {}),
      })
      .eq('id', attemptId)

    if (error !== null) {
      logPersistenceError(this.logger, PROVIDER_FAILURE_OPERATION, error)
      throw new RepositoryError('No fue posible registrar el estado del pago')
    }
  }
}
