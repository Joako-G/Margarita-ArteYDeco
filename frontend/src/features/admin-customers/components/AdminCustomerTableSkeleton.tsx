import { Skeleton } from '@/shared/components'

export function AdminCustomerTableSkeleton() {
  return (
    <div aria-label="Cargando clientes" className="admin-customer-table admin-customer-table--skeleton" role="status">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="admin-customer-table__skeleton-row" key={index}>
          {Array.from({ length: 5 }, (__, cellIndex) => <Skeleton key={cellIndex} />)}
        </div>
      ))}
    </div>
  )
}
