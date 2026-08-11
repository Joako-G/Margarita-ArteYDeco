import { useEffect } from 'react'
import { CircleAlert } from 'lucide-react'

import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  DashboardOverview,
  DashboardRecentOrders,
  DashboardSkeleton,
  DashboardStockPanel,
  useAdminDashboard,
} from '@/features/admin-dashboard'
import { Button } from '@/shared/components'
import { getApiErrorStatus } from '@/shared/services/api/errors'

import '@/features/admin-dashboard/admin-dashboard.css'

export function AdminDashboardPage() {
  const dashboard = useAdminDashboard()
  useRefreshAdminSessionOnUnauthorized(dashboard.error)

  useEffect(() => {
    document.title = 'Panel principal | Margaritas Arte & Deco'

    return () => {
      document.title = 'Margaritas Arte & Deco'
    }
  }, [])

  return (
    <main className="admin-page admin-dashboard" aria-labelledby="admin-dashboard-title">
      <AdminPageHeader
        currentLabel="Inicio"
        description="Un resumen de tus productos, los pedidos recibidos y la actividad reciente de tu tienda."
        sectionLabel="Administración"
        title="Resumen de tu tienda"
        titleId="admin-dashboard-title"
      />

      {dashboard.isPending ? <DashboardSkeleton /> : null}

      {dashboard.isError && getApiErrorStatus(dashboard.error) !== 401 ? (
        <section
          aria-labelledby="dashboard-error-title"
          className="admin-dashboard__error"
          role="alert"
        >
          <CircleAlert aria-hidden="true" size={28} />
          <div>
            <h2 id="dashboard-error-title">No pudimos cargar el resumen</h2>
            <p>Verificá tu conexión y volvé a intentar en un momento.</p>
          </div>
          <Button onClick={() => void dashboard.refetch()} variant="secondary">
            Reintentar
          </Button>
        </section>
      ) : null}

      {dashboard.data ? (
        <div className="admin-dashboard__content">
          <DashboardOverview metrics={dashboard.data.metrics} />
          <div className="admin-dashboard__operational-grid">
            <DashboardRecentOrders
              completedOrders={dashboard.data.metrics.completedOrders}
              orders={dashboard.data.recentOrders}
            />
            <DashboardStockPanel
              lowStockProducts={dashboard.data.lowStockProducts}
              metrics={dashboard.data.metrics}
            />
          </div>
        </div>
      ) : null}
    </main>
  )
}
