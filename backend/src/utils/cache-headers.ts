import type { Response } from 'express'

export function setPublicCacheHeaders(response: Response, maxAgeSeconds: number): void {
  const staleWhileRevalidate = Math.max(maxAgeSeconds * 2, 60)

  response.setHeader(
    'Cache-Control',
    `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidate}`,
  )
}
