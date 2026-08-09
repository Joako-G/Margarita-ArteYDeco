import sharp from 'sharp'

import { AppError } from '../utils/app-error.js'
import type { ProductImageMimeType } from '../utils/product-image.js'

export const CATALOG_IMAGE_MAX_PIXELS = 40_000_000
export const CATALOG_IMAGE_OUTPUT_MAX_BYTES = 2 * 1_024 * 1_024
export const CATEGORY_IMAGE_MAX_DIMENSION = 1_200
export const PRODUCT_IMAGE_MAX_DIMENSION = 1_600
export const WEBP_QUALITY = 82

type CatalogImageEntityType = 'category' | 'product'

export interface IProcessedCatalogImage {
  file: Buffer
  height: number
  mimeType: 'image/webp'
  size: number
  width: number
}

export interface ICatalogImageService {
  process(
    file: Buffer,
    mimeType: ProductImageMimeType,
    entity: CatalogImageEntityType,
  ): Promise<IProcessedCatalogImage>
}

const EXPECTED_FORMATS: Readonly<Record<ProductImageMimeType, string>> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function getEntityCode(entity: CatalogImageEntityType): 'CATEGORY' | 'PRODUCT' {
  return entity === 'category' ? 'CATEGORY' : 'PRODUCT'
}

function getMaxDimension(entity: CatalogImageEntityType): number {
  return entity === 'category' ? CATEGORY_IMAGE_MAX_DIMENSION : PRODUCT_IMAGE_MAX_DIMENSION
}

function hasWebpSignature(file: Buffer): boolean {
  return file.length >= 12 &&
    file.subarray(0, 4).toString('ascii') === 'RIFF' &&
    file.subarray(8, 12).toString('ascii') === 'WEBP'
}

export class CatalogImageService implements ICatalogImageService {
  public async process(
    file: Buffer,
    mimeType: ProductImageMimeType,
    entity: CatalogImageEntityType,
  ): Promise<IProcessedCatalogImage> {
    const entityCode = getEntityCode(entity)

    try {
      const metadata = await sharp(file, {
        animated: false,
        failOn: 'warning',
        limitInputPixels: CATALOG_IMAGE_MAX_PIXELS,
      }).metadata()

      if (
        metadata.format !== EXPECTED_FORMATS[mimeType] ||
        metadata.width === undefined ||
        metadata.height === undefined ||
        metadata.width <= 0 ||
        metadata.height <= 0
      ) {
        throw new AppError(
          400,
          'El contenido del archivo no coincide con una imagen válida',
          `${entityCode}_IMAGE_INVALID`,
        )
      }

      if ((metadata.pages ?? 1) > 1) {
        throw new AppError(
          400,
          'La imagen debe ser estática',
          `${entityCode}_IMAGE_ANIMATED_UNSUPPORTED`,
        )
      }

      const maxDimension = getMaxDimension(entity)
      const { data, info } = await sharp(file, {
        animated: false,
        failOn: 'warning',
        limitInputPixels: CATALOG_IMAGE_MAX_PIXELS,
      })
        .autoOrient()
        .resize({
          fit: 'inside',
          height: maxDimension,
          width: maxDimension,
          withoutEnlargement: true,
        })
        .webp({
          alphaQuality: 100,
          effort: 4,
          quality: WEBP_QUALITY,
          smartSubsample: true,
        })
        .toBuffer({ resolveWithObject: true })

      if (info.format !== 'webp' || !hasWebpSignature(data)) {
        throw new AppError(
          500,
          'No pudimos optimizar la imagen',
          `${entityCode}_IMAGE_PROCESSING_FAILED`,
        )
      }

      if (data.length > CATALOG_IMAGE_OUTPUT_MAX_BYTES) {
        throw new AppError(
          413,
          'La imagen optimizada sigue siendo demasiado grande',
          `${entityCode}_IMAGE_OUTPUT_TOO_LARGE`,
        )
      }

      return {
        file: data,
        height: info.height,
        mimeType: 'image/webp',
        size: data.length,
        width: info.width,
      }
    } catch (error) {
      if (error instanceof AppError) throw error

      throw new AppError(
        400,
        'No pudimos procesar la imagen. Probá con otro archivo JPG, PNG o WebP',
        `${entityCode}_IMAGE_INVALID`,
      )
    }
  }
}
