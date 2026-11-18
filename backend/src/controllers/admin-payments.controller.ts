import type { NextFunction, Request, Response } from 'express'

import { getAuthenticatedAdmin } from '../middlewares/admin-auth.middleware.js'
import {
  adminPaymentActionBodySchema,
  adminPaymentAttemptParamsSchema,
  adminPaymentReconciliationFiltersSchema,
  adminPaymentReviewSchema,
} from '../schemas/admin-payments.schema.js'
import type { IAdminPaymentService } from '../services/admin-payments.service.js'

export class AdminPaymentController {
  public constructor(private readonly service: IAdminPaymentService) {}

  public list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.status(200).json({ success: true, data: await this.service.list(adminPaymentReconciliationFiltersSchema.parse(request.query)) })
    } catch (error) {
      next(error)
    }
  }

  public retry = this.action('retry')
  public sync = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const { attemptId } = adminPaymentAttemptParamsSchema.parse(request.params)
      adminPaymentActionBodySchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      const result = await this.service.sync(attemptId, actor.id)
      response.status(200).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  public review = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const { attemptId } = adminPaymentAttemptParamsSchema.parse(request.params)
      const actor = getAuthenticatedAdmin(request)
      await this.service.review(attemptId, adminPaymentReviewSchema.parse(request.body), actor.id)
      response.status(200).json({ success: true, data: null })
    } catch (error) {
      next(error)
    }
  }

  private action(action: 'retry') {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const { attemptId } = adminPaymentAttemptParamsSchema.parse(request.params)
        adminPaymentActionBodySchema.parse(request.body)
        const actor = getAuthenticatedAdmin(request)
        await this.service[action](attemptId, actor.id)
        response.status(200).json({ success: true, data: null })
      } catch (error) {
        next(error)
      }
    }
  }
}
