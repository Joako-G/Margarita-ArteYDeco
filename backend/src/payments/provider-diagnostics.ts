import axios from 'axios'

const MAX_PROVIDER_DIAGNOSTIC_LENGTH = 200

export interface SafeProviderDiagnostics {
  providerCode?: string
  providerMessage?: string
  statusCode?: number
}

function sanitizeProviderValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const normalized = [...value]
    .map((character) => character.codePointAt(0)! < 32 || character.codePointAt(0)! === 127 ? ' ' : character)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

  if (
    normalized.length === 0
    || /access[_ -]?token|authorization|bearer|cookie|customer|email|password|phone|secret|token|url|https?:\/\/|request[_ -]?body|raw|select\s|insert\s|update\s|delete\s|from\s|where\s/i.test(normalized)
    || /\b\d{7,}\b/.test(normalized)
  ) return undefined

  return normalized.slice(0, MAX_PROVIDER_DIAGNOSTIC_LENGTH)
}

function getProviderPayload(error: unknown): Record<string, unknown> | null {
  if (!axios.isAxiosError(error) || typeof error.response?.data !== 'object' || error.response.data === null) {
    return null
  }

  return error.response.data as Record<string, unknown>
}

export function getSafeProviderDiagnostics(error: unknown): SafeProviderDiagnostics {
  if (!axios.isAxiosError(error)) return {}

  const payload = getProviderPayload(error)
  const providerCode = sanitizeProviderValue(payload?.error_code ?? payload?.code ?? payload?.error)
  const providerMessage = sanitizeProviderValue(payload?.message)

  return {
    ...(providerCode === undefined ? {} : { providerCode }),
    ...(providerMessage === undefined ? {} : { providerMessage }),
    ...(typeof error.response?.status === 'number' ? { statusCode: error.response.status } : {}),
  }
}
