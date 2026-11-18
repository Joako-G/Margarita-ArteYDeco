import { formatAdminDate } from '../../../shared/utils/format-admin-date.ts'

export function formatDashboardDate(value: string): string {
  return formatAdminDate(value)
}

export function getPaymentMethodLabel(method: 'bank_transfer' | 'cash' | 'mercado_pago'): string {
  if (method === 'bank_transfer') return 'Transferencia'
  if (method === 'mercado_pago') return 'Mercado Pago'
  return 'Efectivo'
}
