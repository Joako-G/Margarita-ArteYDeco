export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function createWhatsAppProofUrl(
  whatsapp: string,
  customerName: string,
  orderNumber: string,
): string {
  const message = `Hola, soy ${customerName}. Quiero enviar el comprobante de transferencia del pedido ${orderNumber}.`

  return `https://wa.me/${normalizePhone(whatsapp)}?text=${encodeURIComponent(message)}`
}
