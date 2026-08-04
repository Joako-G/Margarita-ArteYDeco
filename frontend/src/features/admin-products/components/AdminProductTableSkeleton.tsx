import { useEffect, useState } from 'react'

import { Skeleton } from '@/shared/components'

const MOBILE_MEDIA_QUERY = '(max-width: 39.999rem)'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MEDIA_QUERY).matches : false,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}

export function AdminProductTableSkeleton() {
  const isMobile = useIsMobile()

  if (isMobile) {
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
