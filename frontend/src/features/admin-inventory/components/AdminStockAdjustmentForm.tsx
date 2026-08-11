import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, CircleAlert, PackageCheck } from 'lucide-react'

import { Button, Input, Radio, TextArea } from '@/shared/components'

import {
  adminStockAdjustmentSchema,
  type AdminStockAdjustmentFormType,
} from '../schemas/admin-stock-adjustment.schema'

interface IAdminStockAdjustmentFormProps {
  currentStock: number
  disabled?: boolean
  isSubmitting: boolean
  onConfirm: (values: AdminStockAdjustmentFormType) => Promise<void>
}

export function AdminStockAdjustmentForm({
  currentStock,
  disabled = false,
  isSubmitting,
  onConfirm,
}: IAdminStockAdjustmentFormProps) {
  const [pendingValues, setPendingValues] = useState<AdminStockAdjustmentFormType | null>(null)
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<AdminStockAdjustmentFormType>({
    defaultValues: { direction: 'increase', quantity: 1, reason: '' },
    resolver: zodResolver(adminStockAdjustmentSchema),
  })

  function prepareConfirmation(values: AdminStockAdjustmentFormType): void {
    if (values.direction === 'decrease' && values.quantity > currentStock) {
      setError('quantity', {
        message: 'No podés retirar más unidades que el stock disponible.',
      })
      return
    }
    setPendingValues(values)
  }

  async function confirmAdjustment(): Promise<void> {
    if (pendingValues === null) return
    try {
      await onConfirm(pendingValues)
      setPendingValues(null)
      reset()
    } catch {
      // The parent exposes the API error and keeps this confirmation available for retry.
    }
  }

  const projectedStock = pendingValues === null
    ? currentStock
    : currentStock + (pendingValues.direction === 'increase'
      ? pendingValues.quantity
      : -pendingValues.quantity)

  return (
    <section aria-labelledby="stock-adjustment-title" className="admin-inventory__panel">
      <div className="admin-inventory__heading">
        <div>
          <p>Inventario</p>
          <h2 id="stock-adjustment-title">Ajustar stock</h2>
        </div>
        <div className="admin-inventory__current-stock" aria-label={`Stock actual: ${currentStock}`}>
          <PackageCheck aria-hidden="true" size={20} />
          <span>Stock actual</span>
          <strong>{currentStock}</strong>
        </div>
      </div>

      {disabled ? (
        <div className="admin-inventory__notice" role="status">
          <CircleAlert aria-hidden="true" size={20} />
          <p>Guardá o descartá los cambios del producto antes de ajustar el stock.</p>
        </div>
      ) : null}

      {pendingValues === null ? (
        <form className="admin-inventory__form" noValidate onSubmit={handleSubmit(prepareConfirmation)}>
          <Controller
            control={control}
            name="direction"
            render={({ field }) => (
              <fieldset className="admin-inventory__direction" disabled={disabled || isSubmitting}>
                <legend>Tipo de ajuste</legend>
                <Radio
                  checked={field.value === 'increase'}
                  label="Agregar unidades"
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={() => field.onChange('increase')}
                  value="increase"
                />
                <Radio
                  checked={field.value === 'decrease'}
                  label="Retirar unidades"
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={() => field.onChange('decrease')}
                  value="decrease"
                />
              </fieldset>
            )}
          />
          <div className="admin-inventory__form-fields">
            <Input
              disabled={disabled || isSubmitting}
              error={errors.quantity?.message}
              inputMode="numeric"
              label="Cantidad"
              min={1}
              placeholder="Ej.: 5"
              step={1}
              type="number"
              {...register('quantity', { valueAsNumber: true })}
            />
            <TextArea
              disabled={disabled || isSubmitting}
              error={errors.reason?.message}
              helpText="El motivo quedará guardado en el historial del producto."
              label="Motivo"
              maxLength={500}
              placeholder="Ej.: Ingreso de mercadería del proveedor."
              rows={3}
              {...register('reason')}
            />
          </div>
          <div className="admin-inventory__form-actions">
            <Button disabled={disabled} type="submit">
              Revisar ajuste
            </Button>
          </div>
        </form>
      ) : (
        <div className="admin-inventory__confirmation" role="region" aria-live="polite">
          <div>
            {pendingValues.direction === 'increase'
              ? <ArrowUp aria-hidden="true" size={22} />
              : <ArrowDown aria-hidden="true" size={22} />}
            <div>
              <strong>Confirmá el nuevo stock</strong>
              <p>Esta operación quedará registrada y no puede editarse.</p>
            </div>
          </div>
          <dl>
            <div><dt>Stock actual</dt><dd>{currentStock}</dd></div>
            <div><dt>Cambio</dt><dd>{pendingValues.direction === 'increase' ? '+' : '-'}{pendingValues.quantity}</dd></div>
            <div><dt>Stock resultante</dt><dd>{projectedStock}</dd></div>
            <div><dt>Motivo</dt><dd>{pendingValues.reason}</dd></div>
          </dl>
          <div className="admin-inventory__form-actions">
            <Button disabled={isSubmitting} onClick={() => setPendingValues(null)} variant="secondary">
              Volver
            </Button>
            <Button
              isLoading={isSubmitting}
              loadingText="Guardando ajuste…"
              onClick={() => void confirmAdjustment()}
            >
              Confirmar ajuste
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
