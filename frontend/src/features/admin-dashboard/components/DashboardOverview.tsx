import type { IAdminDashboard } from '../types/admin-dashboard'

interface IDashboardOverviewProps {
  metrics: IAdminDashboard['metrics']
}

export function DashboardOverview({ metrics }: IDashboardOverviewProps) {
  return (
    <section aria-labelledby="dashboard-overview-title" className="admin-dashboard__overview">
      <div className="admin-dashboard__section-heading">
        <div>
          <p className="admin-dashboard__section-label">Resumen</p>
          <h2 id="dashboard-overview-title">Así está tu tienda hoy</h2>
        </div>
        <p>Los números de tu tienda de un solo vistazo.</p>
      </div>

      <dl className="admin-dashboard__metrics">
        <div>
          <dt>Pedidos por atender</dt>
          <dd>{metrics.openOrders}</dd>
        </div>
        <div>
          <dt>Productos a la venta</dt>
          <dd>{metrics.activeProducts}</dd>
        </div>
        <div>
          <dt>Clientes</dt>
          <dd>{metrics.customers}</dd>
        </div>
        <div>
          <dt>Categorías</dt>
          <dd>{metrics.categories}</dd>
        </div>
      </dl>
    </section>
  )
}
