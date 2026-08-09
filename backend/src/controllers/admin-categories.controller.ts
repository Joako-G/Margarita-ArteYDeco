import type { NextFunction, Request, Response } from 'express'

import { getAuthenticatedAdmin } from '../middlewares/admin-auth.middleware.js'
import {
  adminCategoryCreateSchema,
  adminCategoryFiltersSchema,
  adminCategoryIdParamsSchema,
  adminCategoryImageMutationSchema,
  adminCategoryPublicationSchema,
  adminCategorySoftDeleteSchema,
  adminCategoryUpdateSchema,
} from '../schemas/admin-categories.schema.js'
import type { IAdminCategoryService } from '../services/admin-categories.service.js'
import { validateCategoryImage } from '../utils/product-image.js'

export class AdminCategoryController {
  public constructor(private readonly service: IAdminCategoryService) {}

  public list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = adminCategoryFiltersSchema.parse(request.query)
      response.status(200).json({ success: true, data: await this.service.list(filters) })
    } catch (error) {
      next(error)
    }
  }

  public getById = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { categoryId } = adminCategoryIdParamsSchema.parse(request.params)
      response.status(200).json({ success: true, data: await this.service.getById(categoryId) })
    } catch (error) {
      next(error)
    }
  }

  public create = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = adminCategoryCreateSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(201).json({ success: true, data: await this.service.create(input, actor.id) })
    } catch (error) {
      next(error)
    }
  }

  public update = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { categoryId } = adminCategoryIdParamsSchema.parse(request.params)
      const input = adminCategoryUpdateSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.update(categoryId, input, actor.id),
      })
    } catch (error) {
      next(error)
    }
  }

  public replaceImage = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { categoryId } = adminCategoryIdParamsSchema.parse(request.params)
      const { expectedUpdatedAt } = adminCategoryImageMutationSchema.parse(request.query)
      const image = validateCategoryImage(request.body, request.get('content-type'))
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.replaceImage(
          categoryId,
          expectedUpdatedAt,
          image.file,
          image.mimeType,
          actor.id,
        ),
      })
    } catch (error) {
      next(error)
    }
  }

  public setPublication = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { categoryId } = adminCategoryIdParamsSchema.parse(request.params)
      const input = adminCategoryPublicationSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.setPublication(categoryId, input, actor.id),
      })
    } catch (error) {
      next(error)
    }
  }

  public softDelete = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { categoryId } = adminCategoryIdParamsSchema.parse(request.params)
      const { expectedUpdatedAt } = adminCategorySoftDeleteSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      await this.service.softDelete(categoryId, expectedUpdatedAt, actor.id)
      response.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
