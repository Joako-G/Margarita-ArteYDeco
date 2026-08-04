import { Skeleton } from '@/shared/components'

export function AdminProductTableSkeleton() {
  return (
    <div aria-label="Cargando productos" className="admin-product-skeleton" role="status">
      <span className="sr-only">Cargando productos…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div className="admin-product-skeleton__row" key={index}>
          <Skeleton className="admin-product-skeleton__image" />
          <Skeleton className="admin-product-skeleton__line" />
          <Skeleton className="admin-product-skeleton__line admin-product-skeleton__line--short" />
        </div>
      ))}
    </div>
  )
}
