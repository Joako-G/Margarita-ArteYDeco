import type { NextFunction, Request, Response } from 'express'

import { getAuthenticatedAdmin } from '../middlewares/admin-auth.middleware.js'
import {
  adminCustomerFiltersSchema,
  adminCustomerIdParamsSchema,
  adminCustomerOrderFiltersSchema,
  adminCustomerSoftDeleteSchema,
  adminCustomerUpdateSchema,
} from '../schemas/admin-customers.schema.js'
import type { IAdminCustomerService } from '../services/admin-customers.service.js'

export class AdminCustomerController {
  public constructor(private readonly service: IAdminCustomerService) {}

  public list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = adminCustomerFiltersSchema.parse(request.query)
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
      const { customerId } = adminCustomerIdParamsSchema.parse(request.params)
      const filters = adminCustomerOrderFiltersSchema.parse(request.query)
      response.status(200).json({ success: true, data: await this.service.getById(customerId, filters) })
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
      const { customerId } = adminCustomerIdParamsSchema.parse(request.params)
      const input = adminCustomerUpdateSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.update(customerId, input, actor.id),
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
      const { customerId } = adminCustomerIdParamsSchema.parse(request.params)
      const { expectedUpdatedAt } = adminCustomerSoftDeleteSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      await this.service.softDelete(customerId, expectedUpdatedAt, actor.id)
      response.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
