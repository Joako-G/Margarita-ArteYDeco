import type { IAdminDashboard } from '../types/admin-dashboard'

interface IDashboardOverviewProps {
  metrics: IAdminDashboard['metrics']
}

export function DashboardOverview({ metrics }: IDashboardOverviewProps) {
  return (
    <section aria-labelledby="dashboard-overview-title" className="admin-dashboard__overview">
      <div className="admin-dashboard__section-heading">
        <div>
          <p className="admin-dashboard__section-label">Vista general</p>
          <h2 id="dashboard-overview-title">Estado del negocio</h2>
        </div>
        <p>Datos actuales del catálogo y la operación.</p>
      </div>

      <dl className="admin-dashboard__metrics">
        <div>
          <dt>Pedidos en curso</dt>
          <dd>{metrics.openOrders}</dd>
        </div>
        <div>
          <dt>Productos activos</dt>
          <dd>{metrics.activeProducts}</dd>
        </div>
        <div>
          <dt>Clientes registrados</dt>
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
