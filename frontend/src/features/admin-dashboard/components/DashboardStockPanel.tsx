import { AlertTriangle, PackageCheck, PackageX } from 'lucide-react'

import type { IAdminDashboard } from '../types/admin-dashboard'

interface IDashboardStockPanelProps {
  lowStockProducts: IAdminDashboard['lowStockProducts']
  metrics: IAdminDashboard['metrics']
}

export function DashboardStockPanel({
  lowStockProducts,
  metrics,
}: IDashboardStockPanelProps) {
  return (
    <section aria-labelledby="dashboard-stock-title" className="admin-dashboard__panel">
      <div className="admin-dashboard__panel-heading">
        <span aria-hidden="true" className="admin-dashboard__panel-icon">
          <PackageCheck size={22} />
        </span>
        <div>
          <p className="admin-dashboard__section-label">Inventario</p>
          <h2 id="dashboard-stock-title">Atención de stock</h2>
        </div>
      </div>

      <dl className="admin-dashboard__stock-metrics">
        <div>
          <dt>
            <PackageX aria-hidden="true" size={18} />
            Sin stock
          </dt>
          <dd>{metrics.outOfStockProducts}</dd>
        </div>
        <div>
          <dt>
            <AlertTriangle aria-hidden="true" size={18} />
            Stock bajo
          </dt>
          <dd>{metrics.lowStockProducts}</dd>
        </div>
      </dl>

      <div className="admin-dashboard__subsection-heading">
        <h3>Prioridad de reposición</h3>
        <span>Hasta 5 productos</span>
      </div>

      {lowStockProducts.length === 0 ? (
        <p className="admin-dashboard__empty">No hay productos activos con stock bajo.</p>
      ) : (
        <ul className="admin-dashboard__stock-list">
          {lowStockProducts.map((product) => (
            <li key={product.id}>
              <span>{product.name}</span>
              <strong>
                {product.stockQuantity} {product.stockQuantity === 1 ? 'unidad' : 'unidades'}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
