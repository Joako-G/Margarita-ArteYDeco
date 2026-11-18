import { Typography } from '@/shared/components'

export function LegalReviewNotice() {
  return (
    <aside aria-label="Aviso de revisión legal" className="legal-review-notice">
      <Typography variant="small">
        Esta sección puede cambiar mientras se encuentra bajo revisión profesional. El contenido
        publicado es informativo y está pendiente de revisión legal definitiva.
      </Typography>
    </aside>
  )
}
