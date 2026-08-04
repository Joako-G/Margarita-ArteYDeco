import { z } from 'zod'

export function createAdminOrderCancellationSchema(requiresManualRefund: boolean) {
  return z.object({
    confirmManualRefund: z.boolean(),
    reason: z.string().trim()
      .min(3, 'Ingresá un motivo de al menos 3 caracteres')
      .max(500, 'Ingresá hasta 500 caracteres'),
  }).refine(
    (value) => !requiresManualRefund || value.confirmManualRefund,
    {
      message: 'Confirmá que gestionarás el reintegro manualmente',
      path: ['confirmManualRefund'],
    },
  )
}

export type AdminOrderCancellationFormType = z.infer<
  ReturnType<typeof createAdminOrderCancellationSchema>
>
