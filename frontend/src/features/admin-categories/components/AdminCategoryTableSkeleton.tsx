import { useEffect, useState } from 'react'

import { Skeleton } from '@/shared/components'

type AdminCategoryListLayoutType = 'mobile' | 'card' | 'table'

const LAYOUT_MEDIA_QUERY = '(min-width: 80rem)'
const MOBILE_MEDIA_QUERY = '(max-width: 39.999rem)'

function useAdminCategoryListLayout() {
  const [layout, setLayout] = useState<AdminCategoryListLayoutType>(() => {
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

function AdminCategoryCardSkeleton() {
  return (
    <div className="admin-category-skeleton__card">
      <Skeleton className="admin-category-skeleton__card-image" />
      <div className="admin-category-skeleton__card-body">
        <Skeleton className="admin-category-skeleton__card-title" />
        <Skeleton className="admin-category-skeleton__card-line" />
        <Skeleton className="admin-category-skeleton__card-line admin-category-skeleton__card-line--short" />
      </div>
    </div>
  )
}

function AdminCategoryHorizontalCardSkeleton() {
  return (
    <div className="admin-category-skeleton__horizontal-card">
      <Skeleton className="admin-category-skeleton__horizontal-card-image" />
      <div className="admin-category-skeleton__horizontal-card-body">
        <Skeleton className="admin-category-skeleton__horizontal-card-title" />
        <Skeleton className="admin-category-skeleton__horizontal-card-line" />
      </div>
      <div className="admin-category-skeleton__horizontal-card-aside">
        <Skeleton className="admin-category-skeleton__horizontal-card-pill" />
        <Skeleton className="admin-category-skeleton__horizontal-card-pill admin-category-skeleton__horizontal-card-pill--short" />
      </div>
    </div>
  )
}

function AdminCategoryTableRowSkeleton() {
  return (
    <div className="admin-category-skeleton__row">
      <Skeleton className="admin-category-skeleton__image" />
      <Skeleton className="admin-category-skeleton__text" />
      <Skeleton className="admin-category-skeleton__text admin-category-skeleton__text--short" />
      <Skeleton className="admin-category-skeleton__text admin-category-skeleton__text--short" />
      <Skeleton className="admin-category-skeleton__text admin-category-skeleton__text--short" />
    </div>
  )
}

export function AdminCategoryTableSkeleton() {
  const layout = useAdminCategoryListLayout()

  if (layout === 'mobile') {
    return (
      <div
        aria-label="Cargando categorías"
        className="admin-category-skeleton admin-category-skeleton--cards"
        role="status"
      >
        <span className="sr-only">Cargando categorías…</span>
        {Array.from({ length: 3 }, (_, index) => (
          <AdminCategoryCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (layout === 'card') {
    return (
      <div
        aria-label="Cargando categorías"
        className="admin-category-skeleton admin-category-skeleton--horizontal-cards"
        role="status"
      >
        <span className="sr-only">Cargando categorías…</span>
        {Array.from({ length: 4 }, (_, index) => (
          <AdminCategoryHorizontalCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div aria-label="Cargando categorías" className="admin-category-skeleton" role="status">
      <span className="sr-only">Cargando categorías…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <AdminCategoryTableRowSkeleton key={index} />
      ))}
    </div>
  )
}
