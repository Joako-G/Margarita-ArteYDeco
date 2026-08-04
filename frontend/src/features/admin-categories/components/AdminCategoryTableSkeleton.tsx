import { Skeleton } from '@/shared/components'

export function AdminCategoryTableSkeleton() {
  return (
    <div aria-label="Cargando categorías" className="admin-category-skeleton" role="status">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="admin-category-skeleton__row" key={index}>
          <Skeleton className="admin-category-skeleton__image" />
          <Skeleton className="admin-category-skeleton__text" />
        </div>
      ))}
      <span className="sr-only">Cargando listado de categorías</span>
    </div>
  )
}
