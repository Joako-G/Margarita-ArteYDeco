import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { getRouteMetadata } from '@/router/route-metadata'
import { applyDocumentMetadata } from '@/router/document-metadata'

export function RouteScrollManager() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (hash) return

    window.scrollTo({ left: 0, top: 0 })
    const animationFrameId = window.requestAnimationFrame(() => {
      const mainContent = document.querySelector<HTMLElement>('#main-content, main')

      if (!mainContent) return

      const hadTabIndex = mainContent.hasAttribute('tabindex')
      if (!hadTabIndex) mainContent.setAttribute('tabindex', '-1')
      mainContent.focus({ preventScroll: true })

      if (!hadTabIndex) {
        mainContent.addEventListener('blur', () => mainContent.removeAttribute('tabindex'), {
          once: true,
        })
      }
    })

    return () => window.cancelAnimationFrame(animationFrameId)
  }, [hash, pathname])

  useEffect(() => {
    if (pathname.startsWith('/categoria/')) return

    const metadata = getRouteMetadata(pathname)

    applyDocumentMetadata(metadata, pathname)
  }, [pathname])

  return <Outlet />
}
