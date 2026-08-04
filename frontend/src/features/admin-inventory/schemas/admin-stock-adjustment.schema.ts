import { z } from 'zod'

export const adminStockAdjustmentSchema = z.strictObject({
  direction: z.enum(['decrease', 'increase']),
  quantity: z.number({ error: 'Ingresá una cantidad.' })
    .int('La cantidad debe ser un número entero.')
    .positive('La cantidad debe ser mayor que cero.')
    .max(2_147_483_647, 'La cantidad es demasiado grande.'),
  reason: z.string()
    .trim()
    .min(3, 'Contanos brevemente el motivo del ajuste.')
    .max(500, 'El motivo puede tener hasta 500 caracteres.'),
})

export type AdminStockAdjustmentFormType = z.infer<typeof adminStockAdjustmentSchema>
