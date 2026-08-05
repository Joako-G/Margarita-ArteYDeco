import { useEffect, useState } from 'react'

import { Skeleton } from '@/shared/components'

type AdminOrderListLayoutType = 'mobile' | 'card' | 'table'

const LAYOUT_MEDIA_QUERY = '(min-width: 80rem)'
const MOBILE_MEDIA_QUERY = '(max-width: 39.999rem)'

function useAdminOrderListLayout() {
  const [layout, setLayout] = useState<AdminOrderListLayoutType>(() => {
    if (typeof window === 'undefined') return 'table'

    return window.matchMedia(LAYOUT_MEDIA_QUERY).matches ? 'table' : 'mobile'
  })

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const layoutQuery = window.matchMedia(LAYOUT_MEDIA_QUERY)

    const handleChange = () => {
      if (layoutQuery.matches) {
        setLayout('table')
      } else if (mobileQuery.matches) {
        setLayout('mobile')
      } else {
        setLayout('card')
      }
    }

    mobileQuery.addEventListener('change', handleChange)
    layoutQuery.addEventListener('change', handleChange)

    return () => {
      mobileQuery.removeEventListener('change', handleChange)
      layoutQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return layout
}

export function AdminOrderTableSkeleton() {
  const layout = useAdminOrderListLayout()

  if (layout === 'mobile') {
    return (
      <div
        aria-label="Cargando pedidos"
        className="admin-order-skeleton admin-order-skeleton--cards"
        role="status"
      >
        <span className="sr-only">Cargando pedidos…</span>
        {Array.from({ length: 3 }, (_, index) => (
          <div className="admin-order-skeleton__card" key={index}>
            <div className="admin-order-skeleton__card-header">
              <Skeleton className="admin-order-skeleton__card-pill" />
              <Skeleton className="admin-order-skeleton__card-title" />
            </div>
            <div className="admin-order-skeleton__card-body">
              <Skeleton className="admin-order-skeleton__card-line" />
              <Skeleton className="admin-order-skeleton__card-line admin-order-skeleton__card-line--short" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (layout === 'card') {
    return (
      <div
        aria-label="Cargando pedidos"
        className="admin-order-skeleton admin-order-skeleton--horizontal-cards"
        role="status"
      >
        <span className="sr-only">Cargando pedidos…</span>
        {Array.from({ length: 4 }, (_, index) => (
          <div className="admin-order-horizontal-card admin-order-horizontal-card__skeleton" key={index}>
            <div className="admin-order-horizontal-card__content">
              <div className="admin-order-horizontal-card__skeleton-main">
                <Skeleton className="admin-order-horizontal-card__skeleton-pill" />
                <Skeleton className="admin-order-horizontal-card__skeleton-title" />
              </div>
              <div className="admin-order-horizontal-card__skeleton-blocks">
                <Skeleton className="admin-order-horizontal-card__skeleton-block" />
                <Skeleton className="admin-order-horizontal-card__skeleton-block admin-order-horizontal-card__skeleton-block--short" />
              </div>
            </div>
            <div className="admin-order-horizontal-card__skeleton-aside">
              <Skeleton className="admin-order-horizontal-card__skeleton-pill" />
              <Skeleton className="admin-order-horizontal-card__skeleton-pill admin-order-horizontal-card__skeleton-pill--short" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div aria-label="Cargando pedidos" className="admin-order-table admin-order-table--skeleton" role="status">
      <span className="sr-only">Cargando pedidos…</span>
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
