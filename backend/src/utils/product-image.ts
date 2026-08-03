import { AppError } from './app-error.js'

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1_024 * 1_024

const IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

export type ProductImageMimeType = keyof typeof IMAGE_EXTENSIONS
export type CategoryImageMimeType = ProductImageMimeType

function hasPngSignature(file: Buffer): boolean {
  return file.length >= 8 && file.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  )
}

function hasJpegSignature(file: Buffer): boolean {
  return file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff
}

function hasWebpSignature(file: Buffer): boolean {
  return file.length >= 12 &&
    file.subarray(0, 4).toString('ascii') === 'RIFF' &&
    file.subarray(8, 12).toString('ascii') === 'WEBP'
}

function validateImage(
  file: unknown,
  contentType: string | undefined,
  entity: 'CATEGORY' | 'PRODUCT',
): { extension: string; file: Buffer; mimeType: ProductImageMimeType } {
  if (!Buffer.isBuffer(file) || file.length === 0) {
    throw new AppError(400, 'Seleccioná una imagen válida', `${entity}_IMAGE_REQUIRED`)
  }

  if (file.length > PRODUCT_IMAGE_MAX_BYTES) {
    throw new AppError(413, 'La imagen no puede superar los 5 MB', `${entity}_IMAGE_TOO_LARGE`)
  }

  if (contentType === undefined || !(contentType in IMAGE_EXTENSIONS)) {
    throw new AppError(
      415,
      'La imagen debe ser JPG, PNG o WebP',
      `${entity}_IMAGE_TYPE_UNSUPPORTED`,
    )
  }

  const mimeType = contentType as ProductImageMimeType
  const signatureMatches = mimeType === 'image/jpeg'
    ? hasJpegSignature(file)
    : mimeType === 'image/png'
      ? hasPngSignature(file)
      : hasWebpSignature(file)

  if (!signatureMatches) {
    throw new AppError(
      400,
      'El contenido del archivo no coincide con una imagen válida',
      `${entity}_IMAGE_INVALID`,
    )
  }

  return { extension: IMAGE_EXTENSIONS[mimeType], file, mimeType }
}

export function validateProductImage(
  file: unknown,
  contentType: string | undefined,
): { extension: string; file: Buffer; mimeType: ProductImageMimeType } {
  return validateImage(file, contentType, 'PRODUCT')
}

export function validateCategoryImage(
  file: unknown,
  contentType: string | undefined,
): { extension: string; file: Buffer; mimeType: CategoryImageMimeType } {
  return validateImage(file, contentType, 'CATEGORY')
}
