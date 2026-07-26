import { useSyncExternalStore } from 'react'

const DESKTOP_MEDIA_QUERY = '(min-width: 1280px)'
const MEDIUM_MEDIA_QUERY = '(min-width: 768px)'
const DESKTOP_PAGE_SIZE = 8
const MEDIUM_PAGE_SIZE = 6
const SMALL_PAGE_SIZE = 4

function getCatalogPageSize() {
  if (window.matchMedia(DESKTOP_MEDIA_QUERY).matches) return DESKTOP_PAGE_SIZE
  if (window.matchMedia(MEDIUM_MEDIA_QUERY).matches) return MEDIUM_PAGE_SIZE

  return SMALL_PAGE_SIZE
}

function subscribeToViewportChanges(onStoreChange: () => void) {
  const mediaQueries = [
    window.matchMedia(DESKTOP_MEDIA_QUERY),
    window.matchMedia(MEDIUM_MEDIA_QUERY),
  ]

  mediaQueries.forEach((mediaQuery) => mediaQuery.addEventListener('change', onStoreChange))

  return () => {
    mediaQueries.forEach((mediaQuery) => mediaQuery.removeEventListener('change', onStoreChange))
  }
}

export function useCatalogPageSize() {
  return useSyncExternalStore(subscribeToViewportChanges, getCatalogPageSize, () => SMALL_PAGE_SIZE)
}
