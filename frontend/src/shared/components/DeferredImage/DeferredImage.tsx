import { useEffect, useRef, useState } from 'react'
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
  const imageRef = useRef<HTMLImageElement>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(
    () => typeof window !== 'undefined' && !('IntersectionObserver' in window),
  )
  const isShowingFallback = Boolean(fallbackSrc && (!src || failedSrc === src))
  const currentSrc = isShowingFallback ? fallbackSrc : src

  useEffect(() => {
    const image = imageRef.current

    if (isVisible || !image || !('IntersectionObserver' in window)) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '160px',
        threshold: 0.01,
      },
    )

    observer.observe(image)

    return () => observer.disconnect()
  }, [isVisible])

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
      ref={imageRef}
      src={isVisible ? (currentSrc ?? undefined) : undefined}
    />
  )
}
