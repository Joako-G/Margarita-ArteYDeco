import { useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'

import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { Button, Skeleton } from '@/shared/components'
import { getApiErrorCode, getApiErrorResponse, getApiErrorStatus } from '@/shared/services/api/errors'

import { useAdjustAdminStock, useAdminInventory } from '../hooks/useAdminInventory'
import type { AdminStockAdjustmentFormType } from '../schemas/admin-stock-adjustment.schema'
import { AdminInventoryHistory } from './AdminInventoryHistory'
import { AdminStockAdjustmentForm } from './AdminStockAdjustmentForm'

interface IAdminInventoryPanelProps {
  hasUnsavedProductChanges: boolean
  productId: string
}

function getAdjustmentError(error: unknown): string {
  if (getApiErrorCode(error) === 'INSUFFICIENT_STOCK_FOR_ADJUSTMENT') {
    return 'No podés retirar más unidades que el stock disponible.'
  }
  return getApiErrorResponse(error)?.message ??
    'No pudimos guardar el ajuste. Revisá la conexión e intentá nuevamente.'
}

export function AdminInventoryPanel({
  hasUnsavedProductChanges,
  productId,
}: IAdminInventoryPanelProps) {
  const [page, setPage] = useState(1)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const history = useAdminInventory(productId, page)
  const adjustment = useAdjustAdminStock(productId)
  const unauthorizedError = history.error ?? adjustment.error
  useRefreshAdminSessionOnUnauthorized(unauthorizedError)

  async function handleAdjustment(values: AdminStockAdjustmentFormType): Promise<void> {
    setSuccessMessage(null)
    const result = await adjustment.mutateAsync({
      direction: values.direction,
      quantity: values.quantity,
      reason: values.reason.trim(),
    })
    setPage(1)
    setSuccessMessage(`Stock actualizado: ahora hay ${result.stockQuantity} unidades.`)
  }

  if (history.isPending) {
    return (
      <section aria-label="Cargando inventario" className="admin-inventory admin-inventory--loading">
        <Skeleton /><Skeleton />
      </section>
    )
  }

  if (history.isError && getApiErrorStatus(history.error) !== 401) {
    return (
      <section className="admin-inventory__load-error" role="alert">
        <CircleAlert aria-hidden="true" size={28} />
        <div>
          <h2>No pudimos cargar el inventario</h2>
          <p>Revisá que el backend esté disponible e intentá nuevamente.</p>
        </div>
        <Button onClick={() => void history.refetch()} variant="secondary">Reintentar</Button>
      </section>
    )
  }

  if (!history.data) return null

  return (
    <div className="admin-inventory">
      {successMessage ? (
        <div className="admin-inventory__feedback admin-inventory__feedback--success" role="status">
          <CircleCheck aria-hidden="true" size={20} />
          <span>{successMessage}</span>
        </div>
      ) : null}
      {adjustment.isError ? (
        <div className="admin-inventory__feedback admin-inventory__feedback--error" role="alert">
          <CircleAlert aria-hidden="true" size={20} />
          <span>{getAdjustmentError(adjustment.error)}</span>
        </div>
      ) : null}
      <AdminStockAdjustmentForm
        currentStock={history.data.product.stockQuantity}
        disabled={hasUnsavedProductChanges}
        isSubmitting={adjustment.isPending}
        onConfirm={handleAdjustment}
      />
      <AdminInventoryHistory history={history.data} onPageChange={setPage} />
    </div>
  )
}
