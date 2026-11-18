export const CHECKOUT_LEGAL_LINKS = {
  privacy: { href: '/politica-de-privacidad', label: 'Política de Privacidad' },
  terms: { href: '/terminos-y-condiciones', label: 'Términos y Condiciones' },
  withdrawal: { href: '/arrepentimiento', label: 'Botón de arrepentimiento' },
} as const

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
