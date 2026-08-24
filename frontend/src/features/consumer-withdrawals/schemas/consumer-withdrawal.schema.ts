import { z } from 'zod'

const phoneSchema = z
  .string()
  .trim()
  .min(8, 'Ingresá un celular válido, con código de área.')
  .max(15, 'Ingresá un celular válido, con código de área.')
  .regex(/^\d+$/, 'Ingresá solo números, con código de área.')

export const consumerWithdrawalSchema = z
  .object({
    comment: z.string().trim().max(1000, 'El comentario puede tener hasta 1000 caracteres.'),
    orderNumber: z.string().trim().max(40, 'Revisá el número de pedido.'),
    orderNumberUnavailable: z.boolean(),
    phone: phoneSchema,
  })
  .superRefine((values, context) => {
    if (!values.orderNumberUnavailable && values.orderNumber.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Ingresá el número de pedido o marcá que no lo encontrás.',
        path: ['orderNumber'],
      })
    }
  })

export const consumerWithdrawalStatusSchema = z.object({
  requestCode: z
    .string()
    .trim()
    .min(1, 'Ingresá el código de tu solicitud.')
    .max(40, 'Revisá el código de tu solicitud.')
    .regex(/^AR-[A-Z0-9-]+$/, 'Ingresá el código con el formato recibido.'),
})

export type ConsumerWithdrawalFormType = z.infer<typeof consumerWithdrawalSchema>
export type ConsumerWithdrawalStatusFormType = z.infer<typeof consumerWithdrawalStatusSchema>
