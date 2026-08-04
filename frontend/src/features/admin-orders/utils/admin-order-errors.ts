export function getAdminOrderErrorMessage(code: string | null): string {
  switch (code) {
    case 'ORDER_UPDATE_CONFLICT':
    case 'ORDER_TRANSITION_CONFLICT':
      return 'El pedido cambió mientras lo revisabas. Recargamos el detalle para que puedas continuar.'
    case 'ORDER_ACTION_NOT_ALLOWED':
      return 'Esta acción ya no está disponible para el estado actual del pedido.'
    case 'ORDER_CANCELLATION_NOT_ALLOWED':
    case 'ORDER_ALREADY_CANCELLED':
      return 'Este pedido ya no puede cancelarse.'
    case 'ORDER_MANUAL_REFUND_CONFIRMATION_REQUIRED':
      return 'Confirmá que gestionarás el reintegro monetario manualmente.'
    default:
      return 'No pudimos actualizar el pedido. Intentá nuevamente.'
  }
}
