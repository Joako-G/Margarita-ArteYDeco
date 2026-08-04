import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { getRouteMetadata } from '@/router/route-metadata'

function setMetaContent(selector: string, content: string) {
  const meta = document.querySelector<HTMLMetaElement>(selector)
  meta?.setAttribute('content', content)
}

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
    const metadata = getRouteMetadata(pathname)
    const canonicalUrl = `${window.location.origin}${pathname}`

    document.title = metadata.title
    setMetaContent('meta[name="description"]', metadata.description)
    setMetaContent('meta[name="robots"]', metadata.robots)
    setMetaContent('meta[property="og:title"]', metadata.title ?? document.title)
    setMetaContent('meta[property="og:description"]', metadata.description)
    setMetaContent('meta[property="og:url"]', canonicalUrl)
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')

    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }

    canonical.href = canonicalUrl
  }, [pathname])

  return <Outlet />
}
