import { useState } from 'react'
import type { ImgHTMLAttributes, SyntheticEvent } from 'react'

interface IDeferredImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'loading' | 'src'> {
  alt: string
  fallbackAlt?: string
  fallbackSrc?: string
  src?: string | null
}

export function DeferredImage({
  alt,
  fallbackAlt,
  fallbackSrc,
  onError,
  src,
  ...props
}: IDeferredImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const isShowingFallback = Boolean(fallbackSrc && (!src || failedSrc === src))
  const currentSrc = isShowingFallback ? fallbackSrc : src

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    onError?.(event)

    if (fallbackSrc && currentSrc && currentSrc !== fallbackSrc) {
      setFailedSrc(currentSrc)
    }
  }

  return (
    <img
      {...props}
      alt={isShowingFallback ? (fallbackAlt ?? alt) : alt}
      decoding="async"
      fetchPriority="low"
      loading="lazy"
      onError={handleError}
      src={currentSrc ?? undefined}
    />
  )
}
