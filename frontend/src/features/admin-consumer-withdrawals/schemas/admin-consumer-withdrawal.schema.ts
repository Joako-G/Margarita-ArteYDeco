import { z } from 'zod'

export const adminConsumerWithdrawalFiltersSchema = z.object({
  compliance: z.enum(['all', 'attention', 'on_time']),
  linkage: z.enum(['all', 'linked', 'unlinked']),
  pageSize: z.enum(['10', '20', '50']),
  search: z.string().trim().max(80),
  sort: z.enum(['newest', 'oldest', 'urgent']),
  status: z.enum(['all', 'received', 'verification_pending', 'under_review', 'applicable', 'not_applicable', 'closed']),
})

export const adminConsumerWithdrawalActionSchema = z.object({
  hasReturnShippingExpense: z.boolean(),
  note: z.string().trim().min(3, 'Ingresá una nota de al menos 3 caracteres.').max(1000),
  publicExplanation: z.string().trim().max(1000),
  reference: z.string().trim().max(120),
  refundAmountConfirmed: z.boolean(),
  returnItems: z.array(z.object({
    nonRestockableQuantity: z.string().trim().regex(/^\d+$/, 'Ingresá unidades enteras.'),
    orderItemId: z.string().uuid(),
    orderedQuantity: z.number().int().positive(),
    productName: z.string().min(1),
    restockableQuantity: z.string().trim().regex(/^\d+$/, 'Ingresá unidades enteras.'),
  })),
  returnShippingRefundAmount: z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/, 'Ingresá un importe válido con hasta 2 decimales.'),
}).superRefine((values, context) => {
  values.returnItems.forEach((item, index) => {
    const restockable = Number(item.restockableQuantity)
    const nonRestockable = Number(item.nonRestockableQuantity)
    if (restockable + nonRestockable !== item.orderedQuantity) {
      context.addIssue({
        code: 'custom',
        message: `Las cantidades deben sumar ${item.orderedQuantity}.`,
        path: ['returnItems', index, 'restockableQuantity'],
      })
    }
  })
})

export const adminConsumerWithdrawalLinkSchema = z.object({
  note: z.string().trim().min(3, 'Ingresá una nota de verificación.').max(500),
  orderId: z.string().uuid('Seleccioná un pedido para vincular.'),
})

export const adminConsumerWithdrawalContingencySchema = z.object({
  note: z.string().trim().min(3, 'Ingresá una nota sobre la recepción.').max(1000),
  orderNumber: z.string().trim().max(40),
  orderNumberUnavailable: z.boolean(),
  phone: z.string().trim().regex(/^\d{8,15}$/, 'Ingresá un celular válido con código de área.'),
  receivedAt: z.string().min(1, 'Indicá cuándo recibiste la solicitud.'),
}).superRefine((values, context) => {
  if (!values.orderNumberUnavailable && values.orderNumber.length === 0) context.addIssue({ code: 'custom', message: 'Ingresá el pedido o indicá que no fue informado.', path: ['orderNumber'] })
})

export type AdminConsumerWithdrawalFiltersFormType = z.infer<typeof adminConsumerWithdrawalFiltersSchema>
export type AdminConsumerWithdrawalActionFormType = z.infer<typeof adminConsumerWithdrawalActionSchema>
export type AdminConsumerWithdrawalLinkFormType = z.infer<typeof adminConsumerWithdrawalLinkSchema>
export type AdminConsumerWithdrawalContingencyFormType = z.infer<typeof adminConsumerWithdrawalContingencySchema>
