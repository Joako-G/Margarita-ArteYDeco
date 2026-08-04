import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

import { Button } from '@/shared/components/Button'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <main className="route-error" id="main-content">
      <p>{isNotFound ? 'Página no encontrada' : 'No pudimos abrir esta página'}</p>
      <h1>{isNotFound ? 'El enlace no está disponible' : 'La carga se interrumpió'}</h1>
      <span>
        {isNotFound
          ? 'Volvé al inicio para seguir navegando.'
          : 'Comprobá tu conexión y volvé a intentarlo.'}
      </span>
      <div>
        <Button onClick={() => window.location.assign('/')}>Volver al inicio</Button>
        {!isNotFound ? (
          <Button onClick={() => window.location.reload()} variant="secondary">
            Reintentar
          </Button>
        ) : null}
      </div>
    </main>
  )
}
