import type { NextFunction, Request, Response } from 'express'

import { productFiltersSchema } from '../schemas/products.schema.js'
import type { IProductService } from '../services/products.service.js'
import { setPublicCacheHeaders } from '../utils/cache-headers.js'

export class ProductController {
  public constructor(
    private readonly service: IProductService,
    private readonly cacheMaxAgeSeconds: number,
  ) {}

  public listPublic = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filters = productFiltersSchema.parse(request.query)
      const products = await this.service.listPublic(filters)

      setPublicCacheHeaders(response, this.cacheMaxAgeSeconds)
      response.status(200).json({ success: true, data: products })
    } catch (error) {
      next(error)
    }
  }
}
