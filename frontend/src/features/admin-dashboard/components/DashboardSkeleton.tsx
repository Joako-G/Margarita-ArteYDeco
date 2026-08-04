import { Skeleton } from '@/shared/components'

export function DashboardSkeleton() {
  return (
    <div aria-label="Cargando resumen administrativo" className="admin-dashboard__skeleton" role="status">
      <Skeleton className="admin-dashboard__skeleton-overview" isDecorative />
      <div className="admin-dashboard__skeleton-grid">
        <Skeleton className="admin-dashboard__skeleton-panel" isDecorative />
        <Skeleton className="admin-dashboard__skeleton-panel" isDecorative />
      </div>
      <span className="sr-only">Cargando resumen administrativo…</span>
    </div>
  )
}
