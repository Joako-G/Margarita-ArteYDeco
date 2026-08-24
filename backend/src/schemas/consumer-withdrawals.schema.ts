import { z } from 'zod'

import { normalizePhone } from './orders.schema.js'

const orderNumberSchema = z.string().trim().toUpperCase()
  .regex(/^MAD-[0-9]{8}-[0-9]{6,}$/)
const phoneSchema = z.string().trim().min(8).max(30).refine(
  (value) => /^[1-9][0-9]{7,14}$/.test(normalizePhone(value)),
  'El celular no es válido',
)

function validateOrderAlternative(
  value: { orderNumber?: string | undefined; orderNumberUnavailable: boolean },
  context: z.RefinementCtx,
): void {
  const hasOrderNumber = value.orderNumber !== undefined
  if (hasOrderNumber === value.orderNumberUnavailable) {
    context.addIssue({
      code: 'custom',
      message: 'Ingresá el número de pedido o indicá que no lo encontrás',
      path: ['orderNumber'],
    })
  }
}

export const createConsumerWithdrawalBodySchema = z.strictObject({
  captchaToken: z.string().trim().min(1).max(2_048).optional(),
  comment: z.string().trim().max(1_000).optional(),
  orderNumber: orderNumberSchema.optional(),
  orderNumberUnavailable: z.boolean(),
  phone: phoneSchema,
}).superRefine(validateOrderAlternative)

export const consumerWithdrawalStatusBodySchema = z.strictObject({
  captchaToken: z.string().trim().min(1).max(2_048).optional(),
  requestCode: z.string().trim().toUpperCase().regex(/^AR-(?:[A-Z2-9]{5}-){4}[A-Z2-9]{6}$/),
})

export const consumerWithdrawalIdParamsSchema = z.strictObject({
  requestId: z.uuid(),
})

export const adminConsumerWithdrawalFiltersSchema = z.strictObject({
  compliance: z.enum(['all', 'attention', 'on_time']).default('all'),
  linkage: z.enum(['all', 'linked', 'unlinked']).default('all'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().min(2).max(80).optional(),
  status: z.enum([
    'all', 'applicable', 'closed', 'not_applicable', 'received', 'under_review',
    'verification_pending',
  ]).default('all'),
  sort: z.enum(['newest', 'oldest', 'urgent']).default('urgent'),
})

export const adminConsumerWithdrawalActionSchema = z.strictObject({
  action: z.enum([
    'close', 'confirmManualRefund', 'correctManualRefund', 'determineApplicable',
    'determineNotApplicable', 'inspectReturn',
    'markRefundManualReview', 'markRefundProcessing', 'receiveReturn',
    'requestVerification', 'startReview',
  ]),
  confirmedTotalRefundAmount: z.number().nonnegative().max(100_000_000).optional(),
  expectedVersion: z.number().int().positive(),
  publicExplanation: z.string().trim().min(10).max(1_000).optional(),
  reference: z.string().trim().min(2).max(120).optional(),
  reason: z.string().trim().min(3).max(1_000).optional(),
  returnItems: z.array(z.strictObject({
    nonRestockableQuantity: z.number().int().nonnegative(),
    orderItemId: z.uuid(),
    restockableQuantity: z.number().int().nonnegative(),
  })).min(1).max(100).optional(),
  returnShippingRefundAmount: z.number().nonnegative().max(100_000_000).optional(),
}).superRefine((value, context) => {
  if (value.action === 'determineNotApplicable' && value.reason === undefined) {
    context.addIssue({ code: 'custom', message: 'La no aplicabilidad requiere fundamento', path: ['reason'] })
  }
  if (value.action === 'determineNotApplicable' && value.publicExplanation === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'La persona necesita una explicación comprensible',
      path: ['publicExplanation'],
    })
  }
  if (value.action === 'confirmManualRefund' && value.reference === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'El reintegro manual requiere una referencia no sensible',
      path: ['reference'],
    })
  }
  if (['confirmManualRefund', 'correctManualRefund'].includes(value.action)
    && value.confirmedTotalRefundAmount === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Confirmá el total del reintegro antes de continuar',
      path: ['confirmedTotalRefundAmount'],
    })
  }
  if (value.action === 'correctManualRefund' && value.reason === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'La rectificación requiere un motivo',
      path: ['reason'],
    })
  }
  if (value.action === 'inspectReturn' && value.returnItems === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'La inspección requiere resolver las unidades de cada producto',
      path: ['returnItems'],
    })
  }
})

export const adminConsumerWithdrawalOrderLinkSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
  note: z.string().trim().min(3).max(500),
  orderId: z.uuid(),
})

export const adminConsumerWithdrawalContingencySchema = z.strictObject({
  note: z.string().trim().min(3).max(1_000),
  orderNumber: orderNumberSchema.optional(),
  orderNumberUnavailable: z.boolean(),
  phone: phoneSchema,
  receivedAt: z.iso.datetime({ offset: true }),
}).superRefine(validateOrderAlternative)

export const consumerWithdrawalRowSchema = z.object({
  applicable_at: z.iso.datetime({ offset: true }).nullable(),
  acknowledgement_issued_at: z.iso.datetime({ offset: true }),
  closed_at: z.iso.datetime({ offset: true }).nullable(),
  contact_phone_normalized: z.string().regex(/^[1-9][0-9]{7,14}$/),
  created_at: z.iso.datetime({ offset: true }),
  customer_comment: z.string().nullable(),
  first_review_due_at: z.iso.datetime({ offset: true }),
  first_reviewed_at: z.iso.datetime({ offset: true }).nullable(),
  id: z.uuid(),
  legal_deadline_at: z.iso.datetime({ offset: true }).nullable(),
  legal_time_basis: z.string().nullable(),
  legal_time_status: z.enum(['apparently_in_time', 'review_required', 'unknown']),
  order_id: z.uuid().nullable(),
  orders: z.object({ id: z.uuid(), order_number: z.string() }).nullable().optional(),
  order_reference_input: z.string().nullable(),
  order_reference_unavailable: z.boolean(),
  public_code_suffix: z.string().min(4).max(8),
  public_resolution_explanation: z.string().nullable(),
  refund_status: z.enum(['failed', 'manual_review', 'not_required', 'pending', 'processing', 'succeeded']),
  not_applicable_at: z.iso.datetime({ offset: true }).nullable(),
  request_status: z.enum(['applicable', 'closed', 'not_applicable', 'received', 'under_review', 'verification_pending']),
  resolution_reason: z.string().nullable(),
  return_status: z.enum(['inspected', 'not_required', 'pending', 'received']),
  source: z.enum(['admin_whatsapp_contingency', 'web']),
  submitted_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  version: z.coerce.number().int().positive(),
})

export const consumerWithdrawalEventRowsSchema = z.array(z.object({
  actor_profile_id: z.uuid().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  event_type: z.string().min(1),
  id: z.uuid(),
  next_status: z.string().nullable(),
  previous_status: z.string().nullable(),
  reason: z.string().nullable(),
}))

export const consumerWithdrawalSettlementSchema = z.object({
  contract_refund_amount: z.coerce.number().nonnegative(),
  original_shipping_refund_amount: z.coerce.number().nonnegative(),
  return_shipping_refund_amount: z.coerce.number().nonnegative(),
  total_refund_amount: z.coerce.number().nonnegative(),
}).nullable()

export const consumerWithdrawalOrderItemRowsSchema = z.array(z.object({
  id: z.uuid(),
  product_name: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
}))

export const consumerWithdrawalReturnItemRowsSchema = z.array(z.object({
  non_restockable_quantity: z.coerce.number().int().nonnegative(),
  order_item_id: z.uuid(),
  ordered_quantity: z.coerce.number().int().positive(),
  restockable_quantity: z.coerce.number().int().nonnegative(),
}))

export const consumerWithdrawalCandidateRowsSchema = z.array(z.object({
  created_at: z.iso.datetime({ offset: true }),
  delivery_method: z.enum(['pickup', 'shipping']),
  id: z.uuid(),
  order_items: z.array(z.object({ product_name: z.string(), quantity: z.coerce.number().int().positive() })),
  order_number: z.string(),
  payment_method: z.enum(['bank_transfer', 'cash']),
  status: z.string(),
  total: z.coerce.number().nonnegative(),
}))
