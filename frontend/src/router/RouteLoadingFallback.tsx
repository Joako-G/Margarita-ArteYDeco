import { Spinner } from '@/shared/components/Spinner'

export function RouteLoadingFallback() {
  return (
    <main aria-label="Cargando página" className="route-loading" id="main-content" role="status">
      <Spinner isDecorative size="large" />
      <p>Preparando la página…</p>
    </main>
  )
}
