export const DEFAULT_WHATSAPP_MESSAGE =
  'Hola, quisiera consultar por un producto que vi en la página.'

export function buildWhatsAppUrl(phone: string, message = DEFAULT_WHATSAPP_MESSAGE): string {
  const normalizedPhone = phone.replace(/\D/g, '')

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message.trim())}`
}
