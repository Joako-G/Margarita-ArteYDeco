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
    document.title = 'Panel principal | Margarita Arte & Deco'

    return () => {
      document.title = 'Margarita Arte & Deco'
    }
  }, [])

  return (
    <main className="admin-page admin-dashboard" aria-labelledby="admin-dashboard-title">
      <AdminPageHeader
        currentLabel="Dashboard"
        description="Una lectura rápida del catálogo, el inventario y los pedidos recientes."
        sectionLabel="Administración"
        title="Panel principal"
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
            <p>Revisá que el backend esté disponible e intentá nuevamente.</p>
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
            <DashboardStockPanel
              lowStockProducts={dashboard.data.lowStockProducts}
              metrics={dashboard.data.metrics}
            />
            <DashboardRecentOrders
              completedOrders={dashboard.data.metrics.completedOrders}
              orders={dashboard.data.recentOrders}
            />
          </div>
        </div>
      ) : null}
    </main>
  )
}
