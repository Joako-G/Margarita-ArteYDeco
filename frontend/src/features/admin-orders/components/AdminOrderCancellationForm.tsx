import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button, Checkbox, TextArea } from '@/shared/components'

import {
  createAdminOrderCancellationSchema,
  type AdminOrderCancellationFormType,
} from '../schemas/admin-order-cancellation.schema'

interface IAdminOrderCancellationFormProps {
  isPending: boolean
  onCancel: () => void
  onSubmit: (values: AdminOrderCancellationFormType) => void
  requiresManualRefund: boolean
}

export function AdminOrderCancellationForm({
  isPending,
  onCancel,
  onSubmit,
  requiresManualRefund,
}: IAdminOrderCancellationFormProps) {
  const schema = useMemo(
    () => createAdminOrderCancellationSchema(requiresManualRefund),
    [requiresManualRefund],
  )
  const { formState: { errors }, handleSubmit, register } = useForm({
    defaultValues: { confirmManualRefund: false, reason: '' },
    resolver: zodResolver(schema),
  })

  return (
    <form className="admin-order-cancellation" noValidate onSubmit={handleSubmit(onSubmit)}>
      <p>
        Al cancelar, el stock de todos los productos se restaura una sola vez y el pedido no
        podrá reabrirse.
      </p>
      <TextArea
        error={errors.reason?.message}
        label="Motivo de la cancelación"
        placeholder="Ej.: solicitud del cliente"
        {...register('reason')}
      />
      {requiresManualRefund ? (
        <div>
          <Checkbox
            aria-describedby={errors.confirmManualRefund ? 'manual-refund-error' : undefined}
            aria-invalid={Boolean(errors.confirmManualRefund)}
            label="Confirmo que gestionaré el reintegro monetario manualmente"
            {...register('confirmManualRefund')}
          />
          {errors.confirmManualRefund ? (
            <p className="admin-order-cancellation__error" id="manual-refund-error" role="alert">
              {errors.confirmManualRefund.message}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="admin-order-cancellation__actions">
        <Button disabled={isPending} onClick={onCancel} type="button" variant="secondary">
          Volver
        </Button>
        <Button isLoading={isPending} loadingText="Cancelando…" type="submit">
          Cancelar pedido
        </Button>
      </div>
    </form>
  )
}
