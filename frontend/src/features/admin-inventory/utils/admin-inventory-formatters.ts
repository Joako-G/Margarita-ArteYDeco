import type { AdminInventoryMovementType } from '../types/admin-inventory'
import { formatAdminDate } from '../../../shared/utils/format-admin-date.ts'

const MOVEMENT_LABELS: Record<AdminInventoryMovementType, string> = {
  consumer_withdrawal_return: 'Reposición por arrepentimiento',
  initial_stock: 'Stock inicial',
  manual_adjustment: 'Ajuste manual',
  order_cancelled: 'Reposición por cancelación',
  order_created: 'Venta',
  payment_re_reserved: 'Reserva por aprobación tardía',
  payment_reservation_released: 'Liberación de reserva para revisión',
}

export function formatInventoryDate(value: string): string {
  return formatAdminDate(value, 'short')
}

export function formatQuantityDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

export function getInventoryMovementLabel(type: AdminInventoryMovementType): string {
  return MOVEMENT_LABELS[type]
}
