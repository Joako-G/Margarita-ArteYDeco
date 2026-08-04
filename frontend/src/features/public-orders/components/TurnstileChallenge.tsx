import { useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

import { env } from '@/config/env'
import { Spinner } from '@/shared/components'

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface ITurnstileRenderOptions {
  action: string
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
  language: string
  sitekey: string
  theme: 'light'
}

interface ITurnstileApi {
  remove: (widgetId: string) => void
  render: (container: HTMLElement, options: ITurnstileRenderOptions) => string
}

declare global {
  interface Window {
    turnstile?: ITurnstileApi
  }
}

interface ITurnstileChallengeProps {
  onTokenChange: (token: string | null) => void
}

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile !== undefined) return Promise.resolve()

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[data-mad-turnstile="true"]',
  )

  if (existingScript !== null) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Turnstile unavailable')), {
        once: true,
      })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')

    script.async = true
    script.defer = true
    script.dataset.madTurnstile = 'true'
    script.src = TURNSTILE_SCRIPT_URL
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => {
      script.remove()
      reject(new Error('Turnstile unavailable'))
    }, { once: true })
    document.head.append(script)
  })
}

export function TurnstileChallenge({ onTokenChange }: ITurnstileChallengeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true
    let widgetId: string | null = null

    onTokenChange(null)
    void loadTurnstileScript()
      .then(() => {
        if (!isActive || containerRef.current === null || window.turnstile === undefined) return

        widgetId = window.turnstile.render(containerRef.current, {
          action: 'order_recovery',
          callback: (token) => {
            if (!isActive) return
            onTokenChange(token)
          },
          'error-callback': () => {
            if (!isActive) return
            onTokenChange(null)
            setHasError(true)
          },
          'expired-callback': () => {
            if (!isActive) return
            onTokenChange(null)
          },
          language: 'es',
          sitekey: env.VITE_TURNSTILE_SITE_KEY,
          theme: 'light',
        })
        setIsLoading(false)
      })
      .catch(() => {
        if (!isActive) return
        setHasError(true)
        setIsLoading(false)
      })

    return () => {
      isActive = false
      onTokenChange(null)

      if (widgetId !== null) window.turnstile?.remove(widgetId)
    }
  }, [onTokenChange])

  return (
    <div className="order-recovery__challenge">
      <div className="order-recovery__challenge-heading">
        <ShieldCheck aria-hidden="true" size={22} strokeWidth={2} />
        <strong>Verificación de seguridad</strong>
      </div>
      {isLoading ? (
        <div aria-live="polite" className="order-recovery__challenge-loading" role="status">
          <Spinner isDecorative size="small" />
          Preparando la verificación…
        </div>
      ) : null}
      <div ref={containerRef} />
      {hasError ? (
        <p className="order-recovery__challenge-error" role="alert">
          No pudimos cargar la verificación. Revisá tu conexión e intentá nuevamente.
        </p>
      ) : null}
    </div>
  )
}
