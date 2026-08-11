export type OrderStatusType =
  | 'cancelled'
  | 'confirmed'
  | 'delivered'
  | 'pending'
  | 'picked_up'
  | 'preparing'
  | 'ready'

export const ORDER_STATUS_DETAILS: Record<
  OrderStatusType,
  { label: string; variant: 'error' | 'neutral' | 'success' | 'warning' }
> = {
  cancelled: { label: 'Cancelado', variant: 'error' },
  confirmed: { label: 'Confirmado', variant: 'neutral' },
  delivered: { label: 'Entregado', variant: 'success' },
  pending: { label: 'Pendiente', variant: 'warning' },
  picked_up: { label: 'Retirado', variant: 'success' },
  preparing: { label: 'En preparación', variant: 'neutral' },
  ready: { label: 'Listo', variant: 'success' },
}
