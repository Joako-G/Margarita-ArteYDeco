export type OrderStatusType =
  | 'cancelled'
  | 'paid'
  | 'payment_pending'
  | 'pending'
  | 'picked_up'
  | 'preparing'
  | 'ready'

export const ORDER_STATUS_DETAILS: Record<
  OrderStatusType,
  { label: string; variant: 'error' | 'neutral' | 'success' | 'warning' }
> = {
  cancelled: { label: 'Cancelado', variant: 'error' },
  paid: { label: 'Pagado', variant: 'success' },
  payment_pending: { label: 'Pendiente de pago', variant: 'warning' },
  pending: { label: 'Pendiente', variant: 'warning' },
  picked_up: { label: 'Retirado', variant: 'success' },
  preparing: { label: 'En preparación', variant: 'neutral' },
  ready: { label: 'Listo para retirar', variant: 'success' },
}
