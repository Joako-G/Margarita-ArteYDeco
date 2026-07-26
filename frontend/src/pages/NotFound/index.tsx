import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'

export function NotFoundPage() {
  return (
    <main>
      <h1>Página no encontrada</h1>
      <Link to={routes.home}>Volver al inicio</Link>
    </main>
  )
}
