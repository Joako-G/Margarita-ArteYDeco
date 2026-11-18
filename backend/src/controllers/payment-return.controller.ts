import type { NextFunction, Request, Response } from 'express'
import type { Logger } from 'pino'
import { z } from 'zod'

import type { MercadoPagoConfig } from '../payments/config.js'
import type { IPaymentReconciliationService } from '../services/payment-reconciliation.service.js'

const orderNumberSchema = z.string().trim().toUpperCase().regex(/^MAD-[0-9]{8}-[0-9]{6,}$/)
const RETURN_QUERY_KEYS = ['collection_status', 'external_reference', 'status'] as const
const providerPaymentIdSchema = z.string().trim().regex(/^[0-9]{1,30}$/)

export class PaymentReturnController {
  public constructor(
    private readonly config: MercadoPagoConfig,
    private readonly reconciliationService?: IPaymentReconciliationService,
    private readonly logger?: Logger,
  ) {}

  public redirect = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const parsed = orderNumberSchema.safeParse(request.params.orderNumber)
    if (!parsed.success) {
      response.status(400).json({ error: 'El número de pedido no es válido' })
      return
    }

    try {
      await this.reconcileApprovedReturn(parsed.data, request)
      const target = new URL(`/pedido/${encodeURIComponent(parsed.data)}/pago`, this.config.frontendOrigin)
      for (const key of RETURN_QUERY_KEYS) {
        const value = request.query[key]
        if (typeof value === 'string' && value.length <= 200) target.searchParams.set(key, value)
      }
      response.redirect(303, target.toString())
    } catch (error) {
      next(error)
    }
  }

  private async reconcileApprovedReturn(orderNumber: string, request: Request): Promise<void> {
    if (this.reconciliationService === undefined || !isApprovedReturn(request)) return

    const externalReference = getQueryString(request, 'external_reference')
    if (externalReference?.trim().toUpperCase() !== orderNumber) return

    const paymentId = [getQueryString(request, 'payment_id'), getQueryString(request, 'collection_id')]
      .map((value) => providerPaymentIdSchema.safeParse(value))
      .find((result) => result.success)
    if (paymentId === undefined || !paymentId.success) return

    try {
      await this.reconciliationService.reconcilePayment(paymentId.data)
    } catch {
      this.logger?.warn({ orderNumber }, 'Mercado Pago return reconciliation failed; Webhook retry remains authoritative')
    }
  }
}

function getQueryString(request: Request, key: string): string | null {
  const value = request.query[key]
  return typeof value === 'string' && value.length <= 200 ? value : null
}

function isApprovedReturn(request: Request): boolean {
  const status = getQueryString(request, 'status')?.trim().toLowerCase()
  const collectionStatus = getQueryString(request, 'collection_status')?.trim().toLowerCase()
  const statuses = [status, collectionStatus].filter((value): value is string => value !== undefined && value !== null)
  return statuses.includes('approved') && !statuses.some((value) => value === 'pending' || value === 'rejected')
}
