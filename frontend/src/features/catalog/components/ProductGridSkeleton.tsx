import { ProductCardSkeleton } from '@/features/products'

const SKELETON_COUNT = 8

export function ProductGridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando productos"
      className="catalog-page__grid catalog-page__grid--loading"
      role="status"
    >
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
