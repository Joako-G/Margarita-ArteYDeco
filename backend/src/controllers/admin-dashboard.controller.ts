import type { NextFunction, Request, Response } from 'express'

import type { IAdminDashboardService } from '../services/admin-dashboard.service.js'

export class AdminDashboardController {
  public constructor(private readonly service: IAdminDashboardService) {}

  public getSummary = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      response.status(200).json({
        success: true,
        data: await this.service.getSummary(),
      })
    } catch (error) {
      next(error)
    }
  }
}
