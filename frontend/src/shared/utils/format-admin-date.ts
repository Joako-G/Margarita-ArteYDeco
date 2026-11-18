const BUSINESS_TIME_ZONE = 'America/Argentina/Buenos_Aires'

const mediumDateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: BUSINESS_TIME_ZONE,
})

const shortDateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: BUSINESS_TIME_ZONE,
})

export function formatAdminDate(value: string, style: 'medium' | 'short' = 'medium'): string {
  return (style === 'short' ? shortDateFormatter : mediumDateFormatter).format(new Date(value))
}
