import type { NextFunction, Request, Response } from 'express'

import {
  getAuthenticatedAdmin,
  getAuthenticatedAdminTokens,
} from '../middlewares/admin-auth.middleware.js'
import {
  adminProfileEmailUpdateSchema,
  adminProfileNameUpdateSchema,
  adminProfilePasswordUpdateSchema,
} from '../schemas/admin-auth.schema.js'
import type { IAdminProfileService } from '../services/admin-profile.service.js'
import type { IAdminProfileDetail } from '../types/admin-auth.js'
import { clearAdminSessionCookies } from '../utils/cookies.js'

function toPublicProfile(
  profile: IAdminProfileDetail,
): Omit<IAdminProfileDetail, 'id' | 'isActive'> {
  return {
    createdAt: profile.createdAt,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    updatedAt: profile.updatedAt,
  }
}

export class AdminProfileController {
  public constructor(private readonly service: IAdminProfileService) {}

  public get = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: toPublicProfile(await this.service.get(actor.id)),
      })
    } catch (error) {
      next(error)
    }
  }

  public updateFullName = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const actor = getAuthenticatedAdmin(request)
      const input = adminProfileNameUpdateSchema.parse(request.body)
      response.status(200).json({
        success: true,
        data: toPublicProfile(await this.service.updateFullName(actor.id, input)),
      })
    } catch (error) {
      next(error)
    }
  }

  public requestEmailChange = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const actor = getAuthenticatedAdmin(request)
      const tokens = getAuthenticatedAdminTokens(request)
      const input = adminProfileEmailUpdateSchema.parse(request.body)
      response.status(200).json({
        success: true,
        data: await this.service.requestEmailChange(
          actor.id,
          input,
          tokens.accessToken,
          tokens.refreshToken,
        ),
      })
    } catch (error) {
      next(error)
    }
  }

  public updatePassword = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tokens = getAuthenticatedAdminTokens(request)
      const input = adminProfilePasswordUpdateSchema.parse(request.body)
      await this.service.updatePassword(input, tokens.accessToken, tokens.refreshToken)
      clearAdminSessionCookies(response)
      response.status(200).json({ success: true, data: { authenticated: false } })
    } catch (error) {
      next(error)
    }
  }
}
