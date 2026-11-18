import { z } from 'zod'

export const adminPaymentReconciliationFiltersSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum([
    'all',
    'approved',
    'cancelled',
    'dead_letter',
    'expired',
    'manual_review',
    'pending',
    'rejected',
  ]).default('all'),
})

export const adminPaymentAttemptParamsSchema = z.strictObject({ attemptId: z.uuid() })

export const adminPaymentActionBodySchema = z.strictObject({})

export const adminPaymentReviewSchema = z.strictObject({
  decision: z.enum(['acknowledge', 'retry']),
  note: z.string().trim().min(1).max(500).optional(),
})
