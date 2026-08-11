import type { NextFunction, Request, Response } from 'express'

import type { ISitemapService } from '../services/sitemap.service.js'
import { setPublicCacheHeaders } from '../utils/cache-headers.js'

export class SitemapController {
  public constructor(
    private readonly service: ISitemapService,
    private readonly cacheMaxAgeSeconds: number,
  ) {}

  public get = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sitemap = await this.service.generate()

      setPublicCacheHeaders(response, this.cacheMaxAgeSeconds)
      response.type('application/xml').status(200).send(sitemap)
    } catch (error) {
      next(error)
    }
  }
}
