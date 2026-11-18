import { describe, expect, it, vi } from 'vitest'

import {
  adminCustomerOrderRowsSchema,
} from '../schemas/admin-customers.schema.js'
import { adminDashboardRecentOrderRowsSchema } from '../schemas/admin-dashboard.schema.js'
import {
  adminOrderFiltersSchema,
  adminOrderRowsSchema,
} from '../schemas/admin-orders.schema.js'
import { orderRowSchema } from '../schemas/orders.schema.js'
import { OrderConfirmationService } from '../services/order-confirmation.service.js'
import type { IOrderRepository } from '../repositories/orders.repository.js'
import type { IPaymentCheckoutRepository } from '../repositories/payment-checkout.repository.js'
import type { IStorageUrlService } from '../types/storage.js'

const ORDER_ROW = {
  created_at: '2026-09-22T15:00:00.000Z',
  customer_first_name: 'Marta',
  customer_last_name: 'Gómez',
  delivery_method: 'pickup',
  discount: 0,
  order_number: 'MAD-20260922-000025',
  payment_method: 'mercado_pago',
  payment_status: 'pending',
  shipping_address: null,
  status: 'pending',
  subtotal: 600,
  total: 600,
} as const

describe('Mercado Pago order payment method', () => {
  it('accepts persisted Mercado Pago rows in every order read schema', () => {
    expect(orderRowSchema.safeParse(ORDER_ROW).success).toBe(true)
    expect(adminDashboardRecentOrderRowsSchema.safeParse([{
      created_at: ORDER_ROW.created_at,
      customer_first_name: ORDER_ROW.customer_first_name,
      customer_last_name: ORDER_ROW.customer_last_name,
      order_number: ORDER_ROW.order_number,
      payment_method: ORDER_ROW.payment_method,
      status: ORDER_ROW.status,
      total: ORDER_ROW.total,
    }]).success).toBe(true)
    expect(adminOrderFiltersSchema.safeParse({ paymentMethod: 'mercado_pago' }).success).toBe(true)
    expect(adminOrderRowsSchema.safeParse([{
      ...ORDER_ROW,
      contract_concluded_at: null,
      delivered_at: null,
      customer_phone: '5491123456789',
      customer_phone_normalized: '5491123456789',
      id: 'ad0047db-6715-4cc0-a559-6a72649063bb',
       notes: null,
       order_items: [{ count: 1 }],
       payment_attempts: [],
       payment_status: 'pending',
      picked_up_at: null,
      updated_at: ORDER_ROW.created_at,
    }]).success).toBe(true)
    expect(adminCustomerOrderRowsSchema.safeParse([{
      created_at: ORDER_ROW.created_at,
      id: 'ad0047db-6715-4cc0-a559-6a72649063bb',
      order_number: ORDER_ROW.order_number,
      payment_method: ORDER_ROW.payment_method,
      payment_status: 'pending',
      status: ORDER_ROW.status,
      total: ORDER_ROW.total,
    }]).success).toBe(true)
  })

  it('maps Mercado Pago to its distinct public DTO method', async () => {
    const repository = {
      findConfirmation: vi.fn().mockResolvedValue({
        createdAt: ORDER_ROW.created_at,
        customerFirstName: ORDER_ROW.customer_first_name,
        customerLastName: ORDER_ROW.customer_last_name,
        deliveryMethod: 'pickup',
        discount: 0,
        items: [],
        orderNumber: ORDER_ROW.order_number,
         paymentMethod: 'mercado_pago',
         paymentStatus: 'pending',
         reservationExpiresAt: null,
        shippingAddress: null,
        status: 'pending',
        subtotal: 600,
        total: 600,
      }),
      findOrderSettings: vi.fn().mockResolvedValue({
        address: 'Calle 123',
        bankName: 'Banco',
        businessHours: 'Lunes a viernes',
        mapsUrl: 'https://maps.google.com/example',
        transferAlias: 'alias',
        transferCbu: '0000000000000000000000',
        transferDiscount: 10,
        whatsapp: '5491123456789',
      }),
    } as unknown as IOrderRepository

    const confirmation = await new OrderConfirmationService(repository).get('order-id', 'session-id')

    expect(confirmation?.paymentMethod).toBe('mercado_pago')
    expect(confirmation?.bankDetails).toBeNull()
    expect(confirmation?.totals.discountPercentage).toBe(0)
  })

  it('resolves related product image paths without making them public', async () => {
    const repository = {
      findConfirmation: vi.fn().mockResolvedValue({
        createdAt: ORDER_ROW.created_at,
        customerFirstName: ORDER_ROW.customer_first_name,
        customerLastName: ORDER_ROW.customer_last_name,
        deliveryMethod: 'pickup',
        discount: 0,
        items: [{
          imagePath: 'catalog/product.webp',
          listUnitPrice: 600,
          productDiscountPercentage: 0,
          productName: 'Caja decorada',
          quantity: 1,
          subtotal: 600,
          unitPrice: 600,
        }],
        orderNumber: ORDER_ROW.order_number,
         paymentMethod: 'cash',
         paymentStatus: 'pending',
         reservationExpiresAt: null,
        shippingAddress: null,
        status: 'pending',
        subtotal: 600,
        total: 600,
      }),
      findOrderSettings: vi.fn().mockResolvedValue({
        address: 'Calle 123',
        bankName: 'Banco',
        businessHours: 'Lunes a viernes',
        mapsUrl: 'https://maps.google.com/example',
        transferAlias: 'alias',
        transferCbu: '0000000000000000000000',
        transferDiscount: 10,
        whatsapp: '5491123456789',
      }),
    } as unknown as IOrderRepository
    const storageService: IStorageUrlService = {
      resolveSignedUrls: vi.fn().mockResolvedValue(new Map([
        ['catalog/product.webp', 'https://storage.test/product.webp?token=signed'],
      ])),
    }

    const confirmation = await new OrderConfirmationService(
      repository,
      undefined,
      storageService,
    ).get('order-id', 'session-id')

    expect(confirmation?.items[0]?.imageUrl).toBe('https://storage.test/product.webp?token=signed')
    expect(storageService.resolveSignedUrls).toHaveBeenCalledWith('products', ['catalog/product.webp'])
  })

  it('exposes approved Mercado Pago separately from a still-pending operational order', async () => {
    const repository = {
      findConfirmation: vi.fn().mockResolvedValue({
        createdAt: ORDER_ROW.created_at,
        customerFirstName: ORDER_ROW.customer_first_name,
        customerLastName: ORDER_ROW.customer_last_name,
        deliveryMethod: 'pickup',
        discount: 0,
        items: [],
        orderNumber: ORDER_ROW.order_number,
         paymentMethod: 'mercado_pago',
         paymentStatus: 'pending',
         reservationExpiresAt: null,
        shippingAddress: null,
        status: 'pending',
        subtotal: 600,
        total: 600,
      }),
      findOrderSettings: vi.fn().mockResolvedValue({
        address: 'Calle 123', bankName: 'Banco', businessHours: 'Lunes a viernes',
        mapsUrl: 'https://maps.google.com/example', transferAlias: 'alias',
        transferCbu: '0000000000000000000000', transferDiscount: 10, whatsapp: '5491123456789',
      }),
    } as unknown as IOrderRepository
    const paymentRepository = {
      findLatestAttempt: vi.fn().mockResolvedValue({
        reservationExpiresAt: new Date('2026-09-23T15:00:00.000Z'),
        status: 'approved',
      }),
      findResumableAttempt: vi.fn().mockResolvedValue(null),
    } as unknown as IPaymentCheckoutRepository

    const confirmation = await new OrderConfirmationService(repository, paymentRepository).get('order-id', 'session-id')

    expect(confirmation?.status).toBe('pending')
    expect(confirmation?.paymentStatus).toBe('approved')
    expect(confirmation?.canResumePayment).toBe(false)
  })

  it.each([
    ['pending', true],
    ['rejected', true],
    ['manual_review', false],
    ['expired', false],
  ] as const)('exposes Mercado Pago %s and resume visibility safely', async (attemptStatus, canResume) => {
    const repository = {
      findConfirmation: vi.fn().mockResolvedValue({
        createdAt: ORDER_ROW.created_at, customerFirstName: 'Marta', customerLastName: 'Gómez',
        deliveryMethod: 'pickup', discount: 0, items: [], orderNumber: ORDER_ROW.order_number,
        paymentMethod: 'mercado_pago', paymentStatus: 'pending', shippingAddress: null,
        status: 'pending', subtotal: 600, total: 600,
      }),
      findOrderSettings: vi.fn().mockResolvedValue({
        address: 'Calle 123', bankName: 'Banco', businessHours: 'Lunes a viernes',
        mapsUrl: 'https://maps.google.com/example', transferAlias: 'alias',
        transferCbu: '0000000000000000000000', transferDiscount: 10, whatsapp: '5491123456789',
      }),
    } as unknown as IOrderRepository
    const paymentRepository = {
      findLatestAttempt: vi.fn().mockResolvedValue({
        reservationExpiresAt: new Date('2026-09-23T15:00:00.000Z'), status: attemptStatus,
      }),
      findResumableAttempt: vi.fn().mockResolvedValue(canResume ? {
        providerPreferenceId: 'preference-id', reservationExpiresAt: new Date('2026-09-23T15:00:00.000Z'), status: attemptStatus,
      } : null),
    } as unknown as IPaymentCheckoutRepository

    const confirmation = await new OrderConfirmationService(repository, paymentRepository).get('order-id', 'session-id')

    expect(confirmation?.paymentStatus).toBe(attemptStatus === 'pending' ? 'pending' : attemptStatus)
    expect(confirmation?.canResumePayment).toBe(canResume)
    expect(confirmation?.reservationExpiresAt).toBe('2026-09-23T15:00:00.000Z')
  })

  it('never offers to resume payment on a cancelled order, even with a live preference', async () => {
    const repository = {
      findConfirmation: vi.fn().mockResolvedValue({
        createdAt: ORDER_ROW.created_at, customerFirstName: 'Marta', customerLastName: 'Gómez',
        deliveryMethod: 'pickup', discount: 0, items: [], orderNumber: ORDER_ROW.order_number,
        paymentMethod: 'mercado_pago', paymentStatus: 'pending', shippingAddress: null,
        status: 'cancelled', subtotal: 600, total: 600,
      }),
      findOrderSettings: vi.fn().mockResolvedValue({
        address: 'Calle 123', bankName: 'Banco', businessHours: 'Lunes a viernes',
        mapsUrl: 'https://maps.google.com/example', transferAlias: 'alias',
        transferCbu: '0000000000000000000000', transferDiscount: 10, whatsapp: '5491123456789',
      }),
    } as unknown as IOrderRepository
    const paymentRepository = {
      findLatestAttempt: vi.fn().mockResolvedValue({
        reservationExpiresAt: new Date('2026-09-23T15:00:00.000Z'), status: 'pending',
      }),
      findResumableAttempt: vi.fn().mockResolvedValue({
        providerPreferenceId: 'preference-id', reservationExpiresAt: new Date('2026-09-23T15:00:00.000Z'), status: 'pending',
      }),
    } as unknown as IPaymentCheckoutRepository

    const confirmation = await new OrderConfirmationService(repository, paymentRepository).get('order-id', 'session-id')

    expect(confirmation?.status).toBe('cancelled')
    expect(confirmation?.canResumePayment).toBe(false)
  })
})
