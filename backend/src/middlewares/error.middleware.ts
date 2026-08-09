import type { ErrorRequestHandler, RequestHandler } from 'express'
import type { Logger } from 'pino'
import { ZodError } from 'zod'

import { AppError } from '../utils/app-error.js'

export const notFoundMiddleware: RequestHandler = (_request, response) => {
  response.status(404).json({
    success: false,
    message: 'Recurso no encontrado',
  })
}

export function createErrorMiddleware(logger: Logger): ErrorRequestHandler {
  return (error: unknown, request, response, _next): void => {
    void _next

    if (error instanceof ZodError) {
      response.status(400).json({
        success: false,
        message: 'Los parámetros enviados no son válidos',
        error: 'VALIDATION_ERROR',
      })
      return
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      const isCategoryImage = request.originalUrl.includes('/api/admin/categories/')
      const isProductImage = request.originalUrl.includes('/api/admin/products/')
      const isCatalogImage = isCategoryImage || isProductImage
      response.status(413).json({
        success: false,
        message: `La imagen no puede superar los ${isCatalogImage ? 4 : 5} MB`,
        error: isCategoryImage
          ? 'CATEGORY_IMAGE_TOO_LARGE'
          : isProductImage
            ? 'PRODUCT_IMAGE_TOO_LARGE'
            : 'SETTINGS_LOGO_IMAGE_TOO_LARGE',
      })
      return
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        logger.error(
          { code: error.code, method: request.method, requestId: request.id, url: request.url },
          'La solicitud falló por un error controlado',
        )
      }

      response.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.code,
        ...(error.details ?? {}),
      })
      return
    }

    logger.error(
      {
        error,
        method: request.method,
        requestId: request.id,
        url: request.url,
      },
      'Error interno no controlado',
    )

    response.status(500).json({
      success: false,
      message: 'Ocurrió un error interno',
      error: 'INTERNAL_SERVER_ERROR',
    })
  }
}
