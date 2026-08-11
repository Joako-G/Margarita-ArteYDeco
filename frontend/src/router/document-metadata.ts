import socialPreviewImage from '@/assets/images/hero-decoracion-800.webp'
import { env } from '@/config/env'
import type { IRouteMetadata } from '@/router/route-metadata'

const BRAND_NAME = 'Margaritas Arte & Deco'

function setMetaContent(attribute: 'name' | 'property', key: string, content: string): void {
  let meta = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)

  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attribute, key)
    document.head.append(meta)
  }

  meta.content = content
}

export function getCanonicalUrl(pathname: string): string {
  return new URL(pathname, `${env.VITE_SITE_URL}/`).href
}

export function applyDocumentMetadata(metadata: IRouteMetadata, pathname: string): void {
  const canonicalUrl = getCanonicalUrl(pathname)
  const socialImageUrl = new URL(socialPreviewImage, `${env.VITE_SITE_URL}/`).href

  document.title = metadata.title
  setMetaContent('name', 'description', metadata.description)
  setMetaContent('name', 'robots', metadata.robots)
  setMetaContent('property', 'og:description', metadata.description)
  setMetaContent('property', 'og:image', socialImageUrl)
  setMetaContent('property', 'og:locale', 'es_AR')
  setMetaContent('property', 'og:site_name', BRAND_NAME)
  setMetaContent('property', 'og:title', metadata.title)
  setMetaContent('property', 'og:type', 'website')
  setMetaContent('property', 'og:url', canonicalUrl)
  setMetaContent('name', 'twitter:card', 'summary_large_image')
  setMetaContent('name', 'twitter:description', metadata.description)
  setMetaContent('name', 'twitter:image', socialImageUrl)
  setMetaContent('name', 'twitter:title', metadata.title)

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.append(canonical)
  }

  canonical.href = canonicalUrl
}
