const dashboardDateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDashboardDate(value: string): string {
  return dashboardDateFormatter.format(new Date(value))
}

export function getPaymentMethodLabel(method: 'bank_transfer' | 'cash'): string {
  return method === 'bank_transfer' ? 'Transferencia' : 'Efectivo'
}
