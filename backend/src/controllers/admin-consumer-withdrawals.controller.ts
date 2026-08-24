import type { NextFunction, Request, Response } from 'express'

import { getAuthenticatedAdmin } from '../middlewares/admin-auth.middleware.js'
import {
  adminConsumerWithdrawalActionSchema,
  adminConsumerWithdrawalContingencySchema,
  adminConsumerWithdrawalFiltersSchema,
  adminConsumerWithdrawalOrderLinkSchema,
  consumerWithdrawalIdParamsSchema,
} from '../schemas/consumer-withdrawals.schema.js'
import type { IAdminConsumerWithdrawalService } from '../services/admin-consumer-withdrawals.service.js'

export class AdminConsumerWithdrawalController {
  public constructor(private readonly service: IAdminConsumerWithdrawalService) {}

  public list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = adminConsumerWithdrawalFiltersSchema.parse(request.query)
      response.status(200).json({ success: true, data: await this.service.list(filters) })
    } catch (error) { next(error) }
  }

  public getById = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = consumerWithdrawalIdParamsSchema.parse(request.params)
      response.status(200).json({ success: true, data: await this.service.getById(requestId) })
    } catch (error) { next(error) }
  }

  public getOrderCandidates = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = consumerWithdrawalIdParamsSchema.parse(request.params)
      response.status(200).json({ success: true, data: await this.service.getOrderCandidates(requestId) })
    } catch (error) { next(error) }
  }

  public executeAction = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = consumerWithdrawalIdParamsSchema.parse(request.params)
      const input = adminConsumerWithdrawalActionSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      const idempotencyKey = response.locals.idempotencyKey as string
      response.status(200).json({
        success: true,
        data: await this.service.executeAction(requestId, input, actor.id, idempotencyKey),
      })
    } catch (error) { next(error) }
  }

  public linkOrder = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = consumerWithdrawalIdParamsSchema.parse(request.params)
      const input = adminConsumerWithdrawalOrderLinkSchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      const idempotencyKey = response.locals.idempotencyKey as string
      response.status(200).json({
        success: true,
        data: await this.service.linkOrder(requestId, input, actor.id, idempotencyKey),
      })
    } catch (error) { next(error) }
  }

  public createContingency = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const input = adminConsumerWithdrawalContingencySchema.parse(request.body)
      const actor = getAuthenticatedAdmin(request)
      const idempotencyKey = response.locals.idempotencyKey as string
      response.status(201).json({ success: true, data: await this.service.createContingency(input, actor.id, idempotencyKey) })
    } catch (error) { next(error) }
  }
}
