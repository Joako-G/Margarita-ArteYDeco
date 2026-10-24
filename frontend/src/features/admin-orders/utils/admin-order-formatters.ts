import type {
  AdminOrderActionType,
  AdminPaymentMethodType,
  AdminPaymentReconciliationStatusType,
  AdminPaymentStatusType,
  IAdminOrderDetail,
} from '../types/admin-orders'

import { buildWhatsAppUrl } from '../../../shared/utils/whatsapp.ts'
import { formatAdminDate } from '../../../shared/utils/format-admin-date.ts'

export const PAYMENT_METHOD_LABELS: Record<AdminPaymentMethodType, string> = {
  bank_transfer: 'Transferencia',
  cash: 'Efectivo',
  mercado_pago: 'Mercado Pago',
}

export const PAYMENT_STATUS_DETAILS: Record<
  AdminPaymentStatusType,
  { label: string; variant: 'error' | 'success' | 'warning' }
> = {
  paid: { label: 'Pago confirmado', variant: 'success' },
  pending: { label: 'Pago pendiente', variant: 'warning' },
  rejected: { label: 'Pago rechazado', variant: 'error' },
}

export const PAYMENT_RECONCILIATION_DETAILS: Record<
  AdminPaymentReconciliationStatusType,
  { label: string; variant: 'error' | 'neutral' | 'success' | 'warning' }
> = {
  approved: { label: 'Conciliación aprobada', variant: 'success' },
  cancelled: { label: 'Intento cancelado', variant: 'neutral' },
  dead_letter: { label: 'Revisión requerida', variant: 'error' },
  expired: { label: 'Reserva vencida', variant: 'warning' },
  manual_review: { label: 'Revisión manual', variant: 'warning' },
  pending: { label: 'Conciliación pendiente', variant: 'neutral' },
  rejected: { label: 'Conciliación rechazada', variant: 'error' },
}

export const ORDER_ACTION_LABELS: Record<AdminOrderActionType, string> = {
  confirmPayment: 'Confirmar pago recibido',
  confirmOrder: 'Confirmar pedido',
  markDelivered: 'Marcar como entregado',
  markPickedUp: 'Marcar como retirado',
  markReady: 'Marcar como listo',
  startPreparing: 'Comenzar preparación',
}

export function formatAdminOrderDate(value: string): string {
  return formatAdminDate(value)
}

export function formatPaymentUpdatedAt(value: string | null): string {
  return value === null ? 'Sin actualización de pago' : `Actualizado ${formatAdminOrderDate(value)}`
}

export function getOrderDisplayNumber(orderNumber: string): string {
  return orderNumber.split('-').pop() ?? orderNumber
}

export function buildAdminWhatsAppUrl(phone: string, message: string): string {
  return buildWhatsAppUrl(phone, message)
}

export type AdminWhatsAppTemplateType = 'contact' | 'ready' | 'transferReminder'

export function getAdminWhatsAppTemplate(
  order: IAdminOrderDetail,
  template: AdminWhatsAppTemplateType,
): string {
  const customerName = order.customer.firstName
  if (template === 'ready') {
    if (order.deliveryMethod === 'shipping') {
      const shippingAddress = order.shippingAddress ?? 'la dirección indicada en el pedido'
      return `Hola ${customerName}. Tu pedido ${order.orderNumber} ya está listo. Coordinemos por este medio el costo y la entrega en ${shippingAddress}.`
    }
    return `Hola ${customerName}. Tu pedido ${order.orderNumber} ya está listo para retirar en ${order.business.address}. Horarios: ${order.business.businessHours}. Ubicación: ${order.business.mapsUrl}`
  }
  if (template === 'transferReminder') {
    return `Hola ${customerName}. Tu pedido ${order.orderNumber} está pendiente de pago por transferencia. Si ya realizaste el pago, podés enviarnos el comprobante por este medio.`
  }
  return `Hola ${customerName}, te contactamos de ${order.business.businessName} por tu pedido ${order.orderNumber}.`
}
