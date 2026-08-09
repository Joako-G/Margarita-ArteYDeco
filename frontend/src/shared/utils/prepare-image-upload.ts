export const ACCEPTED_CATALOG_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
]
export const CATALOG_IMAGE_INPUT_MAX_BYTES = 10 * 1_024 * 1_024
export const CATALOG_IMAGE_UPLOAD_MAX_BYTES = 4 * 1_024 * 1_024
export const CATALOG_IMAGE_MAX_PIXELS = 40_000_000
export const CATEGORY_IMAGE_MAX_DIMENSION = 1_200
export const PRODUCT_IMAGE_MAX_DIMENSION = 1_600

const INITIAL_WEBP_QUALITY = 0.82
const MIN_WEBP_QUALITY = 0.7
const MAX_ENCODING_ATTEMPTS = 5

export class ImageUploadPreparationError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'ImageUploadPreparationError'
  }
}

export interface IImageDimensions {
  height: number
  width: number
}

export function calculateImageDimensions(
  width: number,
  height: number,
  maxDimension: number,
): IImageDimensions {
  const scale = Math.min(1, maxDimension / width, maxDimension / height)
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  }
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null || blob.type !== 'image/webp') {
        reject(new ImageUploadPreparationError(
          'Este navegador no pudo preparar la imagen. Probá con otro archivo o navegador.',
        ))
        return
      }
      resolve(blob)
    }, 'image/webp', quality)
  })
}

function getWebpFileName(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'imagen'
  return `${baseName}.webp`
}

async function isAnimatedWebp(file: File): Promise<boolean> {
  if (file.type !== 'image/webp') return false

  const header = new Uint8Array(await file.slice(0, 65_536).arrayBuffer())
  for (let index = 0; index <= header.length - 4; index += 1) {
    if (
      header[index] === 0x41 &&
      header[index + 1] === 0x4e &&
      header[index + 2] === 0x49 &&
      header[index + 3] === 0x4d
    ) {
      return true
    }
  }
  return false
}

export async function prepareImageForUpload(
  file: File,
  maxDimension: number,
): Promise<File> {
  if (file.size <= CATALOG_IMAGE_UPLOAD_MAX_BYTES) return file

  if (await isAnimatedWebp(file)) {
    throw new ImageUploadPreparationError('La imagen debe ser estática.')
  }

  let bitmap: ImageBitmap | null = null

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const inputPixels = bitmap.width * bitmap.height
    if (inputPixels > CATALOG_IMAGE_MAX_PIXELS) {
      throw new ImageUploadPreparationError(
        'La imagen tiene dimensiones demasiado grandes. Elegí una de hasta 40 megapíxeles.',
      )
    }

    let dimensions = calculateImageDimensions(bitmap.width, bitmap.height, maxDimension)
    let quality = INITIAL_WEBP_QUALITY

    for (let attempt = 0; attempt < MAX_ENCODING_ATTEMPTS; attempt += 1) {
      const canvas = document.createElement('canvas')
      canvas.width = dimensions.width
      canvas.height = dimensions.height
      const context = canvas.getContext('2d')

      if (context === null) {
        throw new ImageUploadPreparationError('Este navegador no pudo preparar la imagen.')
      }

      context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height)
      const blob = await encodeCanvas(canvas, quality)
      if (blob.size <= CATALOG_IMAGE_UPLOAD_MAX_BYTES) {
        return new File([blob], getWebpFileName(file.name), {
          lastModified: file.lastModified,
          type: 'image/webp',
        })
      }

      const reduction = Math.min(
        0.9,
        Math.sqrt(CATALOG_IMAGE_UPLOAD_MAX_BYTES / blob.size) * 0.95,
      )
      dimensions = {
        height: Math.max(1, Math.floor(dimensions.height * reduction)),
        width: Math.max(1, Math.floor(dimensions.width * reduction)),
      }
      quality = Math.max(MIN_WEBP_QUALITY, quality - 0.04)
    }
  } catch (error) {
    if (error instanceof ImageUploadPreparationError) throw error
    throw new ImageUploadPreparationError(
      'No pudimos preparar la imagen. Probá con otro archivo JPG, PNG o WebP.',
    )
  } finally {
    bitmap?.close()
  }

  throw new ImageUploadPreparationError(
    'La imagen sigue siendo demasiado grande después de optimizarla.',
  )
}

export function getImageUploadPreparationError(error: unknown): string | null {
  return error instanceof ImageUploadPreparationError ? error.message : null
}
