import type { NextFunction, Request, Response } from 'express'

import { categoryFiltersSchema } from '../schemas/categories.schema.js'
import type { ICategoryService } from '../services/categories.service.js'
import { setPublicCacheHeaders } from '../utils/cache-headers.js'

export class CategoryController {
  public constructor(
    private readonly service: ICategoryService,
    private readonly cacheMaxAgeSeconds: number,
  ) {}

  public listPublic = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filters = categoryFiltersSchema.parse(request.query)
      const categories = await this.service.listPublic(filters)

      setPublicCacheHeaders(response, this.cacheMaxAgeSeconds)
      response.status(200).json({ success: true, data: categories })
    } catch (error) {
      next(error)
    }
  }
}
