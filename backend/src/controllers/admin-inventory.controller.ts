import type { NextFunction, Request, Response } from 'express'

import { getAuthenticatedAdmin } from '../middlewares/admin-auth.middleware.js'
import {
  adminInventoryFiltersSchema,
  adminStockAdjustmentSchema,
} from '../schemas/admin-inventory.schema.js'
import { adminProductIdParamsSchema } from '../schemas/admin-products.schema.js'
import type { IAdminInventoryService } from '../services/admin-inventory.service.js'

export class AdminInventoryController {
  public constructor(private readonly service: IAdminInventoryService) {}

  public getHistory = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { productId } = adminProductIdParamsSchema.parse(request.params)
      const filters = adminInventoryFiltersSchema.parse(request.query)
      response.status(200).json({
        success: true,
        data: await this.service.getHistory(productId, filters),
      })
    } catch (error) {
      next(error)
    }
  }

  public adjustStock = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { productId } = adminProductIdParamsSchema.parse(request.params)
      const input = adminStockAdjustmentSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      response.status(200).json({
        success: true,
        data: await this.service.adjustStock(productId, input, actor.id),
      })
    } catch (error) {
      next(error)
    }
  }
}
