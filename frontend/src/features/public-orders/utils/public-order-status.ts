import type { DeliveryMethodType, OrderStatusType } from '../types/public-orders.ts'

import { ORDER_STATUS_DETAILS } from '../../../shared/utils/order-status.ts'

export function getPublicOrderStatusDetails(
  status: OrderStatusType,
  deliveryMethod: DeliveryMethodType,
) {
  const details = ORDER_STATUS_DETAILS[status]

  if (deliveryMethod === 'shipping' && status === 'delivered') {
    return { ...details, label: 'Enviado' }
  }

  return details
}
