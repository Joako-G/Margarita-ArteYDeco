import express from 'express'
import requestAgent from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { PaymentReturnController } from '../controllers/payment-return.controller.js'
import { loadMercadoPagoConfig } from '../payments/config.js'
import { createPaymentReturnRouter } from '../routes/payment-return.routes.js'

const config = {
  ...loadMercadoPagoConfig({ NODE_ENV: 'development', MP_ENABLED: '0' }),
  frontendOrigin: 'http://localhost:5173',
}

describe('Mercado Pago return boundary', () => {
  it('redirects only valid order numbers to the configured frontend origin', async () => {
    const app = express()
    app.use(createPaymentReturnRouter(new PaymentReturnController(config)))

    await requestAgent(app)
      .get('/MAD-20260923-000001')
      .expect(303)
      .expect('Location', 'http://localhost:5173/pedido/MAD-20260923-000001/pago')
  })

  it('forwards only non-authoritative return signals to the frontend', async () => {
    const app = express()
    app.use(createPaymentReturnRouter(new PaymentReturnController(config)))

    await requestAgent(app)
      .get('/MAD-20260923-000001?status=approved&external_reference=MAD-20260923-000001&payment_id=123')
      .expect(303)
      .expect(
        'Location',
        'http://localhost:5173/pedido/MAD-20260923-000001/pago?external_reference=MAD-20260923-000001&status=approved',
      )
  })

  it('reconciles an approved return before redirecting when its payment identity matches the order', async () => {
    const reconciliationService = { reconcilePayment: vi.fn().mockResolvedValue({ status: 'approved' }) }
    const app = express()
    app.use(createPaymentReturnRouter(new PaymentReturnController(config, reconciliationService as never)))

    const response = await requestAgent(app)
      .get('/MAD-20260923-000001?status=approved&external_reference=MAD-20260923-000001&payment_id=123456')
      .expect(303)

    expect(response.headers.location).toContain('/pedido/MAD-20260923-000001/pago')
    expect(reconciliationService.reconcilePayment).toHaveBeenCalledWith('123456')
  })

  it('redirects when approved return reconciliation fails so the Webhook can retry', async () => {
    const reconciliationService = { reconcilePayment: vi.fn().mockRejectedValue(new Error('provider unavailable')) }
    const app = express()
    app.use(createPaymentReturnRouter(new PaymentReturnController(config, reconciliationService as never)))

    await requestAgent(app)
      .get('/MAD-20260923-000001?status=approved&external_reference=MAD-20260923-000001&collection_id=123456')
      .expect(303)
      .expect('Location', 'http://localhost:5173/pedido/MAD-20260923-000001/pago?external_reference=MAD-20260923-000001&status=approved')
  })

  it('does not reconcile a non-approved return synchronously', async () => {
    const reconciliationService = { reconcilePayment: vi.fn() }
    const app = express()
    app.use(createPaymentReturnRouter(new PaymentReturnController(config, reconciliationService as never)))

    await requestAgent(app)
      .get('/MAD-20260923-000001?status=pending&external_reference=MAD-20260923-000001&payment_id=123456')
      .expect(303)

    expect(reconciliationService.reconcilePayment).not.toHaveBeenCalled()
  })

  it('rejects invalid order numbers without accepting a redirect target', async () => {
    const app = express()
    app.use(createPaymentReturnRouter(new PaymentReturnController(config)))

    await requestAgent(app).get('/https:%2F%2Fevil.example').expect(400)
  })
})
