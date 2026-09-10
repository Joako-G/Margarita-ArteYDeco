import { Link } from 'react-router-dom'

export function TurnstileDisclosure() {
  return (
    <p className="order-recovery__provider-disclosure" role="note">
      Para proteger esta operación, podemos cargar Cloudflare Turnstile cuando el sistema detecta
      una verificación adicional. Cloudflare puede procesar datos técnicos del dispositivo y de la
      interacción según sus políticas. Consultá la{' '}
      <Link to="/politica-de-privacidad">Política de Privacidad</Link>, la{' '}
      <a href="https://www.cloudflare.com/privacypolicy/" rel="noopener noreferrer" target="_blank">
        política de privacidad de Cloudflare
      </a>{' '}
      y sus{' '}
      <a href="https://www.cloudflare.com/terms/" rel="noopener noreferrer" target="_blank">
        términos de servicio
      </a>
      .
    </p>
  )
}
