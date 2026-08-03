import request from 'supertest'
import type { Express } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'
import { createLogger } from '../config/logger.js'
import type { ICategoryService } from '../services/categories.service.js'
import type { IProductService } from '../services/products.service.js'
import type { ISettingsService } from '../services/settings.service.js'
import { createTestDependencies, TEST_ENV } from './test-helpers.js'

const listCategories = vi.fn().mockResolvedValue([
    {
      catalogArea: 'art',
      description: 'Moldes artesanales',
      displayOrder: 0,
      id: '0348e852-f8d6-4ba9-9ca4-355a55f49a58',
      imageUrl: 'https://storage.test/category.webp?token=signed',
      name: 'Moldes',
      slug: 'moldes',
    },
  ])

const categoryService: ICategoryService = {
  listPublic: listCategories,
}

const productService: IProductService = {
  listPublic: vi.fn().mockResolvedValue([]),
}

const settingsService: ISettingsService = {
  getPublic: vi.fn().mockResolvedValue({
    address: 'Calle 123',
    businessHours: 'Lunes a viernes',
    businessName: 'Margaritas Arte & Deco',
    facebook: null,
    id: '3285602f-6297-48f1-9281-6e5cd98a758d',
    instagram: null,
    logoUrl: null,
    mapsUrl: 'https://maps.google.com/example',
    transferDiscount: 10,
    whatsapp: '5491100000000',
  }),
}

function getApp(): Express {
  return createApp(
    TEST_ENV,
    createLogger(TEST_ENV),
    createTestDependencies(categoryService, productService, settingsService),
  )
}

describe('public API', () => {
  it('returns a no-store liveness response with security headers', async () => {
    const response = await request(getApp()).get('/api/health').expect(200)

    expect(response.body).toEqual({ success: true, data: { status: 'ok' } })
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-powered-by']).toBeUndefined()
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('validates and forwards the catalog area filter', async () => {
    const response = await request(getApp())
      .get('/api/public/categories?catalogArea=art')
      .set('Origin', 'http://localhost:5173')
      .expect(200)

    expect(listCategories).toHaveBeenCalledWith({ catalogArea: 'art' })
    expect(response.body.data).toHaveLength(1)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(response.headers['cache-control']).toContain('max-age=60')
  })

  it('rejects unknown or invalid product query parameters', async () => {
    const response = await request(getApp())
      .get('/api/public/products?catalogArea=invalid&unexpected=true')
      .expect(400)

    expect(response.body).toEqual({
      success: false,
      message: 'Los parámetros enviados no son válidos',
      error: 'VALIDATION_ERROR',
    })
  })

  it('does not expose bank details in public settings', async () => {
    const response = await request(getApp()).get('/api/public/settings').expect(200)

    expect(response.body.data.businessName).toBe('Margaritas Arte & Deco')
    expect(response.body.data).not.toHaveProperty('transferAlias')
    expect(response.body.data).not.toHaveProperty('transferCbu')
    expect(response.body.data).not.toHaveProperty('bankName')
    expect(response.body.data).not.toHaveProperty('logoPath')
  })

  it('rejects browser origins outside the explicit allowlist', async () => {
    const response = await request(getApp())
      .get('/api/public/categories')
      .set('Origin', 'https://attacker.example')
      .expect(403)

    expect(response.body).toEqual({
      success: false,
      message: 'Origen no permitido',
      error: 'ORIGIN_NOT_ALLOWED',
    })
  })

  it('returns a consistent response for unknown routes', async () => {
    const response = await request(getApp()).get('/api/unknown').expect(404)

    expect(response.body).toEqual({
      success: false,
      message: 'Recurso no encontrado',
    })
  })
})
