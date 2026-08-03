import type { NextFunction, Request, Response } from 'express'

import type { ISettingsService } from '../services/settings.service.js'
import { setPublicCacheHeaders } from '../utils/cache-headers.js'

export class SettingsController {
  public constructor(
    private readonly service: ISettingsService,
    private readonly cacheMaxAgeSeconds: number,
  ) {}

  public getPublic = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const settings = await this.service.getPublic()

      setPublicCacheHeaders(response, this.cacheMaxAgeSeconds)
      response.status(200).json({ success: true, data: settings })
    } catch (error) {
      next(error)
    }
  }
}
