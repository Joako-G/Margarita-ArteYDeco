import type { NextFunction, Request, Response } from 'express'

import { getAuthenticatedAdmin } from '../middlewares/admin-auth.middleware.js'
import {
  adminProductCreateSchema,
  adminProductFiltersSchema,
  adminProductIdParamsSchema,
  adminProductFeaturedSchema,
  adminProductImageMutationSchema,
  adminProductPublicationSchema,
  adminProductSoftDeleteSchema,
  adminProductUpdateSchema,
} from '../schemas/admin-products.schema.js'
import type { IAdminProductService } from '../services/admin-products.service.js'
import { validateProductImage } from '../utils/product-image.js'

export class AdminProductController {
  public constructor(private readonly service: IAdminProductService) {}

  public list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = adminProductFiltersSchema.parse(request.query)
      response.status(200).json({ success: true, data: await this.service.list(filters) })
    } catch (error) {
      next(error)
    }
  }

  public getCategoryOptions = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      response.status(200).json({
        success: true,
        data: await this.service.getCategoryOptions(),
      })
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
      const { productId } = adminProductIdParamsSchema.parse(request.params)
      response.status(200).json({ success: true, data: await this.service.getById(productId) })
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
      const input = adminProductCreateSchema.parse(request.body)
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
      const { productId } = adminProductIdParamsSchema.parse(request.params)
      const input = adminProductUpdateSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.update(productId, input, actor.id),
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
      const { productId } = adminProductIdParamsSchema.parse(request.params)
      const { expectedUpdatedAt } = adminProductImageMutationSchema.parse(request.query)
      const image = validateProductImage(request.body, request.get('content-type'))
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.replaceImage(
          productId,
          expectedUpdatedAt,
          image.file,
          image.mimeType,
          image.extension,
          actor.id,
        ),
      })
    } catch (error) {
      next(error)
    }
  }

  public removeImage = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { productId } = adminProductIdParamsSchema.parse(request.params)
      const { expectedUpdatedAt } = adminProductImageMutationSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.removeImage(productId, expectedUpdatedAt, actor.id),
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
      const { productId } = adminProductIdParamsSchema.parse(request.params)
      const input = adminProductPublicationSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.setPublication(productId, input, actor.id),
      })
    } catch (error) {
      next(error)
    }
  }

  public setFeatured = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { productId } = adminProductIdParamsSchema.parse(request.params)
      const input = adminProductFeaturedSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.setFeatured(productId, input, actor.id),
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
      const { productId } = adminProductIdParamsSchema.parse(request.params)
      const { expectedUpdatedAt } = adminProductSoftDeleteSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      await this.service.softDelete(productId, expectedUpdatedAt, actor.id)
      response.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
