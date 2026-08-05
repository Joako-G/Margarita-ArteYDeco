import type {
  AdminOrderActionType,
  AdminPaymentMethodType,
  AdminPaymentStatusType,
  IAdminOrderDetail,
} from '../types/admin-orders'

const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const PAYMENT_METHOD_LABELS: Record<AdminPaymentMethodType, string> = {
  bank_transfer: 'Transferencia',
  cash: 'Efectivo',
}

export const PAYMENT_STATUS_DETAILS: Record<
  AdminPaymentStatusType,
  { label: string; variant: 'error' | 'success' | 'warning' }
> = {
  paid: { label: 'Pago confirmado', variant: 'success' },
  pending: { label: 'Pago pendiente', variant: 'warning' },
  rejected: { label: 'Pago rechazado', variant: 'error' },
}

export const ORDER_ACTION_LABELS: Record<AdminOrderActionType, string> = {
  confirmPayment: 'Confirmar pago recibido',
  markPickedUp: 'Marcar como retirado',
  markReady: 'Marcar como listo',
  startPreparing: 'Comenzar preparación',
}

export function formatAdminOrderDate(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}

export function getOrderDisplayNumber(orderNumber: string): string {
  return orderNumber.split('-').pop() ?? orderNumber
}

export function buildAdminWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message.trim())}`
}

export type AdminWhatsAppTemplateType = 'contact' | 'ready' | 'transferReminder'

export function getAdminWhatsAppTemplate(
  order: IAdminOrderDetail,
  template: AdminWhatsAppTemplateType,
): string {
  const customerName = order.customer.firstName
  if (template === 'ready') {
    return `Hola ${customerName}. Tu pedido ${order.orderNumber} ya está listo para retirar en ${order.business.address}. Horarios: ${order.business.businessHours}. Ubicación: ${order.business.mapsUrl}`
  }
  if (template === 'transferReminder') {
    return `Hola ${customerName}. Tu pedido ${order.orderNumber} está pendiente de pago por transferencia. Si ya realizaste el pago, podés enviarnos el comprobante por este medio.`
  }
  return `Hola ${customerName}, te contactamos de ${order.business.businessName} por tu pedido ${order.orderNumber}.`
}
