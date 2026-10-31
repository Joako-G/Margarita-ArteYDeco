import type { ICheckoutFormValues } from '../types/checkout'

// A saved draft may still hold Mercado Pago after it was turned off; cash is not offered for shipping.
export function getAvailablePaymentMethod(
  paymentMethod: ICheckoutFormValues['paymentMethod'],
  deliveryMethod: ICheckoutFormValues['deliveryMethod'],
  isMercadoPagoEnabled: boolean,
): ICheckoutFormValues['paymentMethod'] {
  if (paymentMethod !== 'mercado_pago' || isMercadoPagoEnabled) return paymentMethod
  return deliveryMethod === 'shipping' ? 'transfer' : 'cash'
}
