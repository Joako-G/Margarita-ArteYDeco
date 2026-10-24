import type { IAdminOrderDetail } from '../types/admin-orders'

export interface IAdminPaymentConsultationResult {
  auditRecorded: boolean | null
  order: IAdminOrderDetail
  syncError: unknown | null
}

export async function consultAdminPayment(
  syncPayment: () => Promise<{ auditRecorded: boolean } | null>,
  readOrder: () => Promise<IAdminOrderDetail>,
): Promise<IAdminPaymentConsultationResult> {
  let auditRecorded: boolean | null = null
  let syncError: unknown | null = null

  try {
    auditRecorded = (await syncPayment())?.auditRecorded ?? false
  } catch (error) {
    syncError = error
  }

  return { auditRecorded, order: await readOrder(), syncError }
}

export function getAdminPaymentConsultationFeedback(result: IAdminPaymentConsultationResult): {
  message: string
  type: 'error' | 'success' | 'warning'
} {
  const { auditRecorded, order, syncError } = result

  if (syncError !== null) {
    return order.paymentStatus === 'paid'
      ? {
          message: 'El pedido actualizado figura como pagado, pero no pudimos completar la consulta. Revisá el estado y la disponibilidad antes de prepararlo.',
          type: 'warning',
        }
      : {
          message: 'No pudimos completar la consulta. El pedido actualizado no figura como pagado; revisalo antes de intentar nuevamente.',
          type: 'error',
        }
  }

  if (auditRecorded === false) {
    return {
      message: order.paymentStatus === 'paid'
        ? 'El pedido actualizado figura como pagado, pero no se pudo registrar la consulta administrativa. Revisá el stock e informá la incidencia.'
        : 'La consulta terminó, pero no se pudo registrar en el historial administrativo. Revisá el pedido actualizado e informá la incidencia.',
      type: 'warning',
    }
  }

  if (order.status === 'cancelled') {
    return {
      message: 'El pedido figura cancelado. Revisá el estado del pago y del stock antes de tomar otra medida.',
      type: 'warning',
    }
  }
  if (order.paymentStatus !== 'paid') {
    return {
      message: 'Consulta completada. El pago aún no figura como confirmado; revisá el estado actualizado.',
      type: 'warning',
    }
  }
  if (!order.inventoryAllocationActive) {
    return {
      message: 'El pago figura como confirmado, pero no hay stock reservado. Coordiná la entrega o el reintegro manualmente.',
      type: 'warning',
    }
  }
  return {
    message: 'El pago figura como confirmado. Revisá el estado del pedido antes de prepararlo.',
    type: 'success',
  }
}
