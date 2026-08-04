const adminProductDateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatAdminProductDate(value: string): string {
  return adminProductDateFormatter.format(new Date(value))
}

export function getAdminProductCatalogAreaLabel(area: 'art' | 'decoration'): string {
  return area === 'art' ? 'Arte' : 'Decoraciones'
}
