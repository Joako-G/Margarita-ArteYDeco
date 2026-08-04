const adminProductDateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatAdminProductDate(value: string): string {
  return adminProductDateFormatter.format(new Date(value))
}

export function formatRelativeAdminProductDate(value: string): string {
  const date = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 0) return formatAdminProductDate(value)

  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays === 0) return 'Actualizado hoy'
  if (diffDays === 1) return 'Actualizado ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`

  const diffWeeks = Math.floor(diffDays / 7)

  if (diffWeeks < 5) {
    return diffWeeks === 1 ? 'Hace 1 semana' : `Hace ${diffWeeks} semanas`
  }

  const diffMonths = Math.floor(diffDays / 30)

  if (diffMonths < 12) {
    return diffMonths === 1 ? 'Hace 1 mes' : `Hace ${diffMonths} meses`
  }

  return formatAdminProductDate(value)
}

export function getAdminProductCatalogAreaLabel(area: 'art' | 'decoration'): string {
  return area === 'art' ? 'Arte' : 'Decoraciones'
}
