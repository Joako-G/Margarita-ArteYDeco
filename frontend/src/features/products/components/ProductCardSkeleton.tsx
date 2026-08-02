import { Card, Skeleton } from '@/shared/components'

import './ProductCardSkeleton.css'

export function ProductCardSkeleton() {
  return (
    <Card aria-hidden="true" className="product-card-skeleton">
      <Skeleton className="product-card-skeleton__image" isDecorative />
      <div className="product-card-skeleton__content">
        <Skeleton className="product-card-skeleton__name" isDecorative />
        <Skeleton className="product-card-skeleton__copy" isDecorative />
        <Skeleton
          className="product-card-skeleton__copy product-card-skeleton__copy--short"
          isDecorative
        />
        <Skeleton className="product-card-skeleton__price" isDecorative />
        <Skeleton className="product-card-skeleton__availability" isDecorative />
      </div>
      <div className="product-card-skeleton__actions">
        <Skeleton className="product-card-skeleton__quantity" isDecorative />
        <Skeleton className="product-card-skeleton__button" isDecorative />
      </div>
    </Card>
  )
}
