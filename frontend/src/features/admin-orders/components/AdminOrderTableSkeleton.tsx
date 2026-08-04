import { Skeleton } from '@/shared/components'

export function AdminOrderTableSkeleton() {
  return (
    <div aria-label="Cargando pedidos" className="admin-order-table admin-order-table--skeleton" role="status">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="admin-order-table__skeleton-row" key={index}>
          <Skeleton className="admin-order-table__skeleton-primary" />
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ))}
    </div>
  )
}
