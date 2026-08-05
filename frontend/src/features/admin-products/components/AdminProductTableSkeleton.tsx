import { useEffect, useState } from 'react'

import { Skeleton } from '@/shared/components'

type AdminProductListLayoutType = 'mobile' | 'card' | 'table'

const LAYOUT_MEDIA_QUERY = '(min-width: 80rem)'
const MOBILE_MEDIA_QUERY = '(max-width: 39.999rem)'

function useAdminProductListLayout() {
  const [layout, setLayout] = useState<AdminProductListLayoutType>(() => {
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

export function AdminProductTableSkeleton() {
  const layout = useAdminProductListLayout()

  if (layout === 'mobile') {
    return (
      <div
        aria-label="Cargando productos"
        className="admin-product-skeleton admin-product-skeleton--cards"
        role="status"
      >
        <span className="sr-only">Cargando productos…</span>
        {Array.from({ length: 3 }, (_, index) => (
          <div className="admin-product-skeleton__card" key={index}>
            <Skeleton className="admin-product-skeleton__card-image" />
            <div className="admin-product-skeleton__card-body">
              <Skeleton className="admin-product-skeleton__card-title" />
              <Skeleton className="admin-product-skeleton__card-line" />
              <Skeleton className="admin-product-skeleton__card-line admin-product-skeleton__card-line--short" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (layout === 'card') {
    return (
      <div
        aria-label="Cargando productos"
        className="admin-product-skeleton admin-product-skeleton--horizontal-cards"
        role="status"
      >
        <span className="sr-only">Cargando productos…</span>
        {Array.from({ length: 4 }, (_, index) => (
          <div className="admin-product-skeleton__horizontal-card" key={index}>
            <Skeleton className="admin-product-skeleton__horizontal-card-image" />
            <div className="admin-product-skeleton__horizontal-card-body">
              <Skeleton className="admin-product-skeleton__horizontal-card-title" />
              <div className="admin-product-skeleton__horizontal-card-blocks">
                <Skeleton className="admin-product-skeleton__horizontal-card-block" />
                <Skeleton className="admin-product-skeleton__horizontal-card-block admin-product-skeleton__horizontal-card-block--short" />
              </div>
            </div>
            <div className="admin-product-skeleton__horizontal-card-aside">
              <Skeleton className="admin-product-skeleton__horizontal-card-pill" />
              <Skeleton className="admin-product-skeleton__horizontal-card-pill admin-product-skeleton__horizontal-card-pill--short" />
            </div>
          </div>
        ))}
      </div>
    )
  }

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
