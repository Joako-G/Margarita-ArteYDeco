import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  CATEGORY_IMAGE_MAX_DIMENSION,
  CatalogImageService,
  PRODUCT_IMAGE_MAX_DIMENSION,
  WEBP_QUALITY,
} from '../services/catalog-image.service.js'

const service = new CatalogImageService()

describe('CatalogImageService', () => {
  it('converts JPEG products to bounded WebP images', async () => {
    const input = await sharp({
      create: {
        background: { b: 40, g: 120, r: 220 },
        channels: 3,
        height: 1_200,
        width: 2_400,
      },
    }).jpeg({ quality: 95 }).toBuffer()

    const result = await service.process(input, 'image/jpeg', 'product')
    const metadata = await sharp(result.file).metadata()

    expect(result.mimeType).toBe('image/webp')
    expect(result.width).toBe(PRODUCT_IMAGE_MAX_DIMENSION)
    expect(result.height).toBe(800)
    expect(result.size).toBe(result.file.length)
    expect(metadata.format).toBe('webp')
    expect(result.file.subarray(8, 12).toString('ascii')).toBe('WEBP')
  })

  it('preserves alpha and does not enlarge category images', async () => {
    const input = await sharp({
      create: {
        background: { alpha: 0.4, b: 200, g: 80, r: 120 },
        channels: 4,
        height: 400,
        width: 800,
      },
    }).png().toBuffer()

    const result = await service.process(input, 'image/png', 'category')
    const metadata = await sharp(result.file).metadata()

    expect(CATEGORY_IMAGE_MAX_DIMENSION).toBe(1_200)
    expect(result).toMatchObject({ height: 400, width: 800 })
    expect(metadata.hasAlpha).toBe(true)
  })

  it('applies EXIF orientation before resizing', async () => {
    const input = await sharp({
      create: {
        background: { b: 30, g: 160, r: 90 },
        channels: 3,
        height: 800,
        width: 400,
      },
    })
      .jpeg({ quality: WEBP_QUALITY })
      .withMetadata({ orientation: 6 })
      .toBuffer()

    const result = await service.process(input, 'image/jpeg', 'category')

    expect(result).toMatchObject({ height: 400, width: 800 })
  })

  it('rejects files whose decoded format does not match the declared MIME type', async () => {
    const input = await sharp({
      create: {
        background: { b: 0, g: 0, r: 0 },
        channels: 3,
        height: 10,
        width: 10,
      },
    }).png().toBuffer()

    await expect(service.process(input, 'image/jpeg', 'product')).rejects.toMatchObject({
      code: 'PRODUCT_IMAGE_INVALID',
      statusCode: 400,
    })
  })

  it('rejects invalid image payloads', async () => {
    await expect(
      service.process(Buffer.from('not-an-image'), 'image/webp', 'category'),
    ).rejects.toMatchObject({
      code: 'CATEGORY_IMAGE_INVALID',
      statusCode: 400,
    })
  })
})
