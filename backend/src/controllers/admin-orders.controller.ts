import type { NextFunction, Request, Response } from 'express'

import { getAuthenticatedAdmin } from '../middlewares/admin-auth.middleware.js'
import {
  adminOrderActionSchema,
  adminOrderCancellationSchema,
  adminOrderFiltersSchema,
  adminOrderIdParamsSchema,
} from '../schemas/admin-orders.schema.js'
import type { IAdminOrderService } from '../services/admin-orders.service.js'

export class AdminOrderController {
  public constructor(private readonly service: IAdminOrderService) {}

  public list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = adminOrderFiltersSchema.parse(request.query)
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
      const { orderId } = adminOrderIdParamsSchema.parse(request.params)
      response.status(200).json({ success: true, data: await this.service.getById(orderId) })
    } catch (error) {
      next(error)
    }
  }

  public executeAction = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { orderId } = adminOrderIdParamsSchema.parse(request.params)
      const input = adminOrderActionSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.executeAction(orderId, input, actor.id),
      })
    } catch (error) {
      next(error)
    }
  }

  public cancel = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { orderId } = adminOrderIdParamsSchema.parse(request.params)
      const input = adminOrderCancellationSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.cancel(orderId, input, actor.id),
      })
    } catch (error) {
      next(error)
    }
  }
}
