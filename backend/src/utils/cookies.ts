import type { Response } from 'express'

export const CSRF_COOKIE_NAME = '__Host-mad-csrf'
export const GUEST_SESSION_COOKIE_NAME = '__Host-mad-guest-session'
export const ADMIN_ACCESS_COOKIE_NAME = '__Host-mad-admin-access'
export const ADMIN_REFRESH_COOKIE_NAME = '__Host-mad-admin-refresh'

const BASE_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: true,
}

export function parseCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (cookieHeader === undefined) {
    return null
  }

  const matchingValues = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
    .map((part) => part.slice(name.length + 1))

  if (matchingValues.length !== 1) {
    return null
  }

  const value = matchingValues[0]
  return value === undefined || value.length === 0 ? null : value
}

export function setCsrfCookie(response: Response, token: string): void {
  response.cookie(CSRF_COOKIE_NAME, token, {
    ...BASE_COOKIE_OPTIONS,
    httpOnly: false,
    maxAge: 60 * 60 * 1_000,
  })
}

export function setGuestSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date,
): void {
  response.cookie(GUEST_SESSION_COOKIE_NAME, token, {
    ...BASE_COOKIE_OPTIONS,
    expires: expiresAt,
    httpOnly: true,
  })
}

export function clearGuestSessionCookie(response: Response): void {
  response.clearCookie(GUEST_SESSION_COOKIE_NAME, {
    ...BASE_COOKIE_OPTIONS,
    httpOnly: true,
  })
}

export function setAdminSessionCookies(
  response: Response,
  accessToken: string,
  accessExpiresAt: Date,
  refreshToken: string,
  refreshMaxAgeMs: number,
): void {
  response.cookie(ADMIN_ACCESS_COOKIE_NAME, accessToken, {
    ...BASE_COOKIE_OPTIONS,
    expires: accessExpiresAt,
    httpOnly: true,
  })
  response.cookie(ADMIN_REFRESH_COOKIE_NAME, refreshToken, {
    ...BASE_COOKIE_OPTIONS,
    httpOnly: true,
    maxAge: refreshMaxAgeMs,
  })
}

export function clearAdminSessionCookies(response: Response): void {
  for (const name of [ADMIN_ACCESS_COOKIE_NAME, ADMIN_REFRESH_COOKIE_NAME]) {
    response.clearCookie(name, {
      ...BASE_COOKIE_OPTIONS,
      httpOnly: true,
    })
  }
}
