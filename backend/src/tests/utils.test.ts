import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Response } from 'express'

import { createLogger } from '../config/logger.js'
import { AppError, RepositoryError } from '../utils/app-error.js'
import { setPublicCacheHeaders } from '../utils/cache-headers.js'
import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  GUEST_SESSION_COOKIE_NAME,
  clearAdminSessionCookies,
  clearGuestSessionCookie,
  parseCookieValue,
  setAdminSessionCookies,
  setCsrfCookie,
  setGuestSessionCookie,
} from '../utils/cookies.js'
import {
  CATALOG_IMAGE_UPLOAD_MAX_BYTES,
  validateCategoryImage,
  validateProductImage,
  validateSettingsLogo,
} from '../utils/product-image.js'
import { createSlug } from '../utils/slug.js'

type ResponseMock = Response & {
  setCookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }>
  clearCookieCalls: Array<{ name: string; options: Record<string, unknown> }>
  headers: Map<string, string>
}

function createResponseMock(): ResponseMock {
  const setCookieCalls = [] as Array<{
    name: string
    value: string
    options: Record<string, unknown>
  }>
  const clearCookieCalls = [] as Array<{ name: string; options: Record<string, unknown> }>
  const headers = new Map<string, string>()

  const responseMock = {
    setCookieCalls,
    clearCookieCalls,
    headers,
    cookie: (name: string, value: string, options: Record<string, unknown>) => {
      setCookieCalls.push({ name, value, options })
      return responseMock
    },
    clearCookie: (name: string, options: Record<string, unknown>) => {
      clearCookieCalls.push({ name, options })
      return responseMock
    },
    setHeader: (name: string, value: string) => {
      headers.set(name, value)
      return responseMock
    },
  } as unknown as ResponseMock

  return responseMock
}

let responseMock = createResponseMock()

afterEach(() => {
  responseMock = createResponseMock()
  vi.restoreAllMocks()
})

describe('parseCookieValue', () => {
  it('extracts the only cookie that matches the name', () => {
    expect(parseCookieValue('a=1; __Host-mad-guest-session=abc; b=2', GUEST_SESSION_COOKIE_NAME))
      .toBe('abc')
  })

  it('returns null when the header is missing or ambiguous', () => {
    expect(parseCookieValue(undefined, CSRF_COOKIE_NAME)).toBeNull()
    expect(parseCookieValue('__Host-mad-csrf=x; __Host-mad-csrf=y', CSRF_COOKIE_NAME)).toBeNull()
  })

  it('rejects empty values', () => {
    expect(parseCookieValue('__Host-mad-csrf=; other=1', CSRF_COOKIE_NAME)).toBeNull()
  })
})

describe('session cookies', () => {
  it('sets the CSRF cookie as readable by JavaScript with a short lifetime', () => {
    setCsrfCookie(responseMock, 'csrf-token')

    expect(responseMock.setCookieCalls).toHaveLength(1)
    const [call] = responseMock.setCookieCalls

    expect(call?.name).toBe(CSRF_COOKIE_NAME)
    expect(call?.value).toBe('csrf-token')
    expect(call?.options).toMatchObject({ httpOnly: false, sameSite: 'lax', secure: true })
  })

  it('sets the guest session cookie as HttpOnly and expiring', () => {
    const expiresAt = new Date('2030-01-01T00:00:00Z')

    setGuestSessionCookie(responseMock, 'guest-token', expiresAt)

    expect(responseMock.setCookieCalls).toHaveLength(1)
    const [call] = responseMock.setCookieCalls

    expect(call?.name).toBe(GUEST_SESSION_COOKIE_NAME)
    expect(call?.options).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: true, expires: expiresAt })
  })

  it('writes admin access and refresh cookies in one call each', () => {
    const accessExpiresAt = new Date('2030-01-01T00:00:00Z')

    setAdminSessionCookies(responseMock, 'access', accessExpiresAt, 'refresh', 604_800_000)

    expect(responseMock.setCookieCalls).toHaveLength(2)
    expect(responseMock.setCookieCalls[0]).toMatchObject({
      name: ADMIN_ACCESS_COOKIE_NAME,
      value: 'access',
      options: { httpOnly: true, expires: accessExpiresAt },
    })
    expect(responseMock.setCookieCalls[1]).toMatchObject({
      name: ADMIN_REFRESH_COOKIE_NAME,
      value: 'refresh',
      options: { httpOnly: true, maxAge: 604_800_000 },
    })
  })
})

describe('clearing cookies', () => {
  it('clears the guest session cookie with HttpOnly', () => {
    clearGuestSessionCookie(responseMock)

    expect(responseMock.clearCookieCalls).toHaveLength(1)
    expect(responseMock.clearCookieCalls[0]).toMatchObject({
      name: GUEST_SESSION_COOKIE_NAME,
      options: { httpOnly: true, sameSite: 'lax', secure: true },
    })
  })

  it('clears both admin session cookies on logout', () => {
    clearAdminSessionCookies(responseMock)

    expect(responseMock.clearCookieCalls.map((call) => call.name)).toEqual([
      ADMIN_ACCESS_COOKIE_NAME,
      ADMIN_REFRESH_COOKIE_NAME,
    ])
    expect(responseMock.clearCookieCalls.every((call) => call.options.httpOnly === true)).toBe(true)
  })
})

describe('createLogger redaction', () => {
  it('redacts cookies, tokens, secrets and customer data from logs', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const logger = createLogger({ nodeEnv: 'development' })

    logger.info({
      req: { headers: { authorization: 'Bearer secret', cookie: '__Host-mad-csrf=abc' } },
      res: { headers: { 'set-cookie': 'token=abc' } },
      token: 'abc',
      turnstileToken: 'abc',
      secretKey: 'abc',
      phone: '5491100000000',
      transferAlias: 'alias',
      transferCbu: 'cbu',
    })

    const output = writeSpy.mock.calls.map((call) => String(call[0])).join('')

    expect(output).not.toContain('Bearer secret')
    expect(output).not.toContain('__Host-mad-csrf=abc')
    expect(output).not.toContain('5491100000000')
    expect(output).not.toContain('"alias"')
    expect(output).toContain('[REDACTED]')
  })
})

describe('createSlug', () => {
  it('slugs accented Spanish product names', () => {
    expect(createSlug('Pincel Ángulo Nº 2')).toBe('pincel-angulo-n-2')
    expect(createSlug('  Cajas -- Decoradas  ')).toBe('cajas-decoradas')
  })
})

describe('setPublicCacheHeaders', () => {
  it('allows public caching with stale-while-revalidate fallback', () => {
    setPublicCacheHeaders(responseMock, 60)

    expect(responseMock.headers.get('Cache-Control'))
      .toBe('public, max-age=60, stale-while-revalidate=120')
  })

  it('never emits a stale-while-revalidate below one minute', () => {
    setPublicCacheHeaders(responseMock, 5)

    expect(responseMock.headers.get('Cache-Control'))
      .toBe('public, max-age=5, stale-while-revalidate=60')
  })
})

describe('AppError and RepositoryError', () => {
  it('carries status code, machine code and optional details', () => {
    const error = new AppError(422, 'El celular no es válido', 'PHONE_INVALID', { field: 'phone' })

    expect(error).toBeInstanceOf(Error)
    expect(error.statusCode).toBe(422)
    expect(error.code).toBe('PHONE_INVALID')
    expect(error.details).toEqual({ field: 'phone' })
  })

  it('creates repository failures as unavailable data sources', () => {
    const error = new RepositoryError()

    expect(error.statusCode).toBe(503)
    expect(error.code).toBe('DATA_SOURCE_UNAVAILABLE')
  })
})

function buildImage(mimeType: 'image/jpeg' | 'image/png' | 'image/webp'): Buffer {
  if (mimeType === 'image/jpeg') {
    return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
  }
  if (mimeType === 'image/png') {
    return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
  }
  return Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP'),
  ])
}

describe('image validation', () => {
  it('accepts matching mime type and signature for every entity', () => {
    const product = validateProductImage(buildImage('image/webp'), 'image/webp')
    const category = validateCategoryImage(buildImage('image/jpeg'), 'image/jpeg')
    const logo = validateSettingsLogo(buildImage('image/png'), 'image/png')

    expect(product.extension).toBe('webp')
    expect(category.extension).toBe('jpg')
    expect(logo.extension).toBe('png')
  })

  it('rejects missing, oversized, unsupported or forged files', () => {
    expect(() => validateProductImage(null, 'image/png'))
      .toThrowError(new AppError(400, 'Seleccioná una imagen válida', 'PRODUCT_IMAGE_REQUIRED'))

    expect(() => validateProductImage(Buffer.alloc(CATALOG_IMAGE_UPLOAD_MAX_BYTES + 1), 'image/png'))
      .toThrowError(new AppError(413, 'La imagen no puede superar los 4 MB', 'PRODUCT_IMAGE_TOO_LARGE'))

    expect(() => validateCategoryImage(buildImage('image/png'), 'application/pdf'))
      .toThrowError(new AppError(415, 'La imagen debe ser JPG, PNG o WebP', 'CATEGORY_IMAGE_TYPE_UNSUPPORTED'))

    expect(() => validateSettingsLogo(Buffer.from('not-an-image'), 'image/png'))
      .toThrowError(new AppError(
        400,
        'El contenido del archivo no coincide con una imagen válida',
        'SETTINGS_LOGO_IMAGE_INVALID',
      ))
  })

  it('rejects empty buffers', () => {
    expect(() => validateProductImage(Buffer.alloc(0), 'image/png'))
      .toThrowError(new AppError(400, 'Seleccioná una imagen válida', 'PRODUCT_IMAGE_REQUIRED'))
  })
})
