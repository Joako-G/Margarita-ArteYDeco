import request from 'supertest'
import { z } from 'zod'

import { createApp } from '../app.js'
import { createApplicationDependencies } from '../config/dependencies.js'
import { loadEnv } from '../config/env.js'
import { createLogger } from '../config/logger.js'

const categoryResponseSchema = z.object({
  data: z.array(
    z.object({
      catalogArea: z.enum(['art', 'decoration']),
      id: z.uuid(),
      imageUrl: z.url().nullable(),
      name: z.string().min(1),
      slug: z.string().min(1),
    }),
  ),
  success: z.literal(true),
})

const productResponseSchema = z.object({
  data: z.array(
    z.object({
      categoryId: z.uuid(),
      id: z.uuid(),
      imageUrl: z.url().nullable(),
      name: z.string().min(1),
      price: z.number().positive(),
      stockQuantity: z.number().int().nonnegative(),
    }),
  ),
  success: z.literal(true),
})

const settingsResponseSchema = z
  .object({
    data: z
      .object({
        address: z.string().min(1),
        businessHours: z.string().min(1),
        businessName: z.string().min(1),
        facebook: z.url().nullable(),
        id: z.uuid(),
        instagram: z.url().nullable(),
        logoUrl: z.url().nullable(),
        mapsUrl: z.url(),
        transferDiscount: z.number().min(0).max(100),
        whatsapp: z.string().regex(/^[1-9][0-9]{7,14}$/),
      })
      .strict(),
    success: z.literal(true),
  })
  .strict()

const env = loadEnv()
const logger = createLogger({ nodeEnv: 'test' })
const app = createApp(env, logger, createApplicationDependencies(env, logger))
const origin = env.corsAllowedOrigins[0]

function withOptionalOrigin(testRequest: request.Test): request.Test {
  return origin === undefined ? testRequest : testRequest.set('Origin', origin)
}

const [categoryHttpResponse, productHttpResponse, settingsHttpResponse] = await Promise.all([
  withOptionalOrigin(request(app).get('/api/public/categories')).expect(200),
  withOptionalOrigin(request(app).get('/api/public/products')).expect(200),
  withOptionalOrigin(request(app).get('/api/public/settings')).expect(200),
])

const categoryResponse = categoryResponseSchema.parse(categoryHttpResponse.body)
const productResponse = productResponseSchema.parse(productHttpResponse.body)
const settingsResponse = settingsResponseSchema.parse(settingsHttpResponse.body)

const summary = {
  categories: categoryResponse.data.length,
  categoryImagesResolved: categoryResponse.data.filter((category) => category.imageUrl !== null)
    .length,
  logoResolved: settingsResponse.data.logoUrl !== null,
  productImagesResolved: productResponse.data.filter((product) => product.imageUrl !== null).length,
  products: productResponse.data.length,
  settings: true,
}

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)

const issues: string[] = []

if (categoryResponse.data.length === 0) {
  issues.push('Supabase no devolvió categorías públicas activas')
}

if (productResponse.data.length === 0) {
  issues.push('Supabase no devolvió productos públicos activos')
}

if (issues.length > 0) {
  process.stderr.write(`${issues.join('\n')}\n`)
  process.exitCode = 1
}
