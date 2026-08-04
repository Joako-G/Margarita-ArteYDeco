import type { AdminInventoryMovementType } from '../types/admin-inventory'

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const MOVEMENT_LABELS: Record<AdminInventoryMovementType, string> = {
  initial_stock: 'Stock inicial',
  manual_adjustment: 'Ajuste manual',
  order_cancelled: 'Reposición por cancelación',
  order_created: 'Venta',
}

export function formatInventoryDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

export function formatQuantityDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

export function getInventoryMovementLabel(type: AdminInventoryMovementType): string {
  return MOVEMENT_LABELS[type]
}
