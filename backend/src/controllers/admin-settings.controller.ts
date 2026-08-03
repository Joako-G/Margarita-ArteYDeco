import type { NextFunction, Request, Response } from 'express'

import { getAuthenticatedAdmin } from '../middlewares/admin-auth.middleware.js'
import {
  adminSettingsImageMutationSchema,
  adminSettingsUpdateSchema,
} from '../schemas/admin-settings.schema.js'
import type { IAdminSettingsService } from '../services/admin-settings.service.js'
import { validateSettingsLogo } from '../utils/product-image.js'

export class AdminSettingsController {
  public constructor(private readonly service: IAdminSettingsService) {}

  public get = async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.status(200).json({ success: true, data: await this.service.get() })
    } catch (error) {
      next(error)
    }
  }

  public update = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const input = adminSettingsUpdateSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({ success: true, data: await this.service.update(input, actor.id) })
    } catch (error) {
      next(error)
    }
  }

  public replaceLogo = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { expectedUpdatedAt } = adminSettingsImageMutationSchema.parse(request.query)
      const logo = validateSettingsLogo(request.body, request.get('content-type'))
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.replaceLogo(
          expectedUpdatedAt,
          logo.file,
          logo.mimeType,
          logo.extension,
          actor.id,
        ),
      })
    } catch (error) {
      next(error)
    }
  }

  public removeLogo = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { expectedUpdatedAt } = adminSettingsImageMutationSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.removeLogo(expectedUpdatedAt, actor.id),
      })
    } catch (error) {
      next(error)
    }
  }
}
