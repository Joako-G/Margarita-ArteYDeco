import { describe, expect, it, vi } from 'vitest'

import type { IOrderRepository } from '../repositories/orders.repository.js'
import type { IRecoveryRepository } from '../repositories/recovery.repository.js'
import type { IGuestSessionService } from '../services/guest-sessions.service.js'
import type { IOrderConfirmationService } from '../services/order-confirmation.service.js'
import {
  GuestSessionRequiredError,
  PublicOrderService,
  RecoveryBlockedError,
} from '../services/public-orders.service.js'
import { RecoveryProtectionService } from '../services/recovery-protection.service.js'
import type { ITurnstileService } from '../services/turnstile.service.js'
import type { IPublicOrderConfirmationDto } from '../types/orders.js'
import type { IRecoveryLimitConfig } from '../types/recovery.js'
import { AppError } from '../utils/app-error.js'

const SESSION_ID = '4bed49f2-d735-4f1e-ac56-85bdf5996f7b'
const ORDER_ID = 'ad0047db-6715-4cc0-a559-6a72649063bb'
const ORDER_NUMBER = 'MAD-20260802-000001'
const PHONE = '5491123456789'
const TOKEN = 'A'.repeat(43)
const LIMIT_CONFIG: IRecoveryLimitConfig = {
  blockDurationMs: 1_800_000,
  captchaThreshold: 3,
  maxAttempts: 5,
  windowMs: 900_000,
}
const OPEN_LIMIT = { captchaRequired: false, isBlocked: false, retryAfterSeconds: 0 }

const confirmation: IPublicOrderConfirmationDto = {
  bankDetails: null,
  createdAt: '2026-08-02T15:00:00.000Z',
  delivery: { method: 'pickup', shippingAddress: null },
  items: [{ lineTotal: 600, name: 'Caja decorada', quantity: 1, unitPrice: 600 }],
  orderNumber: ORDER_NUMBER,
  paymentMethod: 'cash',
  pickup: {
    address: 'Calle 123',
    businessHours: 'Lunes a viernes',
    mapsUrl: 'https://maps.google.com/example',
  },
  status: 'pending',
  totals: { discount: 0, discountPercentage: 0, subtotal: 600, total: 600 },
  whatsappProofUrl: 'https://wa.me/5491100000000?text=pedido',
}

function createOrderRepository(): IOrderRepository {
  return {
    createWithStock: vi.fn(),
    findConfirmation: vi.fn(),
    findOrderIdByNumber: vi.fn().mockResolvedValue(ORDER_ID),
    findOrderSettings: vi.fn(),
    findRecentOrderId: vi.fn().mockResolvedValue(ORDER_ID),
    findRecoveryCandidate: vi.fn().mockResolvedValue({ id: ORDER_ID, phoneNormalized: PHONE }),
  }
}

function createRecoveryRepository(): IRecoveryRepository {
  return {
    checkLimit: vi.fn().mockResolvedValue(OPEN_LIMIT),
    clearFailures: vi.fn().mockResolvedValue(undefined),
    registerFailure: vi.fn().mockResolvedValue(OPEN_LIMIT),
  }
}

function createGuestSessionService(): IGuestSessionService {
  return {
    getOrCreate: vi.fn(),
    resolve: vi.fn().mockResolvedValue({
      expiresAt: new Date('2026-09-01T15:00:00.000Z'),
      id: SESSION_ID,
      tokenToSet: null,
    }),
    revokeByToken: vi.fn().mockResolvedValue(true),
    revokeCreatedSession: vi.fn(),
    rotateForRecovery: vi.fn().mockResolvedValue({
      expiresAt: new Date('2026-09-01T15:00:00.000Z'),
      id: SESSION_ID,
      tokenToSet: TOKEN,
    }),
  }
}

function createTurnstileService(): ITurnstileService {
  return { verify: vi.fn().mockResolvedValue('valid') }
}

function createService(
  orderRepository = createOrderRepository(),
  recoveryRepository = createRecoveryRepository(),
  guestSessionService = createGuestSessionService(),
  confirmationService: IOrderConfirmationService = { get: vi.fn().mockResolvedValue(confirmation) },
  turnstileService = createTurnstileService(),
): {
  confirmationService: IOrderConfirmationService
  guestSessionService: IGuestSessionService
  orderRepository: IOrderRepository
  recoveryRepository: IRecoveryRepository
  service: PublicOrderService
  turnstileService: ITurnstileService
} {
  return {
    confirmationService,
    guestSessionService,
    orderRepository,
    recoveryRepository,
    turnstileService,
    service: new PublicOrderService(
      orderRepository,
      recoveryRepository,
      guestSessionService,
      confirmationService,
      new RecoveryProtectionService('test-only-recovery-secret-at-least-32-characters'),
      turnstileService,
      LIMIT_CONFIG,
    ),
  }
}

describe('PublicOrderService', () => {
  it('requires a valid anonymous session before looking up recent orders', async () => {
    const dependencies = createService()
    vi.mocked(dependencies.guestSessionService.resolve).mockResolvedValue(null)

    await expect(dependencies.service.getRecent('invalid')).rejects.toBeInstanceOf(
      GuestSessionRequiredError,
    )
    expect(dependencies.orderRepository.findRecentOrderId).not.toHaveBeenCalled()
  })

  it('does not expose an order that is not related to the active session', async () => {
    const confirmationService = { get: vi.fn().mockResolvedValue(null) }
    const dependencies = createService(
      createOrderRepository(),
      createRecoveryRepository(),
      createGuestSessionService(),
      confirmationService,
    )

    await expect(dependencies.service.getByNumber(ORDER_NUMBER, TOKEN)).rejects.toMatchObject({
      code: 'ORDER_NOT_AVAILABLE',
      statusCode: 404,
    })
    expect(confirmationService.get).toHaveBeenCalledWith(ORDER_ID, SESSION_ID)
  })

  it('loads a recent confirmation only through the current session relation', async () => {
    const dependencies = createService()

    await expect(dependencies.service.getRecent(TOKEN)).resolves.toEqual(confirmation)
    expect(dependencies.orderRepository.findRecentOrderId).toHaveBeenCalledWith(SESSION_ID)
    expect(dependencies.confirmationService.get).toHaveBeenCalledWith(ORDER_ID, SESSION_ID)
  })

  it('returns a generic failure and raises the CAPTCHA signal after invalid attempts', async () => {
    const dependencies = createService()
    vi.mocked(dependencies.orderRepository.findRecoveryCandidate).mockResolvedValue(null)
    vi.mocked(dependencies.recoveryRepository.registerFailure).mockResolvedValue({
      captchaRequired: true,
      isBlocked: false,
      retryAfterSeconds: 0,
    })

    const promise = dependencies.service.recover(
      { orderNumber: ORDER_NUMBER, phone: '+54 9 11 2345-6789' },
      null,
      '203.0.113.7',
    )

    await expect(promise).rejects.toMatchObject({
      code: 'ORDER_RECOVERY_FAILED',
      details: { captchaRequired: true },
      statusCode: 404,
    })
    expect(dependencies.recoveryRepository.registerFailure).toHaveBeenCalledOnce()
    expect(dependencies.guestSessionService.rotateForRecovery).not.toHaveBeenCalled()
  })

  it('requires a Turnstile token before reading the order after the adaptive threshold', async () => {
    const dependencies = createService()
    vi.mocked(dependencies.recoveryRepository.checkLimit).mockResolvedValue({
      captchaRequired: true,
      isBlocked: false,
      retryAfterSeconds: 0,
    })

    await expect(dependencies.service.recover(
      { orderNumber: ORDER_NUMBER, phone: PHONE },
      null,
      '203.0.113.7',
    )).rejects.toMatchObject({
      code: 'HUMAN_VERIFICATION_REQUIRED',
      details: { captchaRequired: true },
      statusCode: 400,
    })
    expect(dependencies.turnstileService.verify).not.toHaveBeenCalled()
    expect(dependencies.recoveryRepository.registerFailure).toHaveBeenCalledOnce()
    expect(dependencies.orderRepository.findRecoveryCandidate).not.toHaveBeenCalled()
  })

  it('continues recovery after Cloudflare validates the adaptive challenge', async () => {
    const dependencies = createService()
    vi.mocked(dependencies.recoveryRepository.checkLimit).mockResolvedValue({
      captchaRequired: true,
      isBlocked: false,
      retryAfterSeconds: 0,
    })

    await expect(dependencies.service.recover(
      { orderNumber: ORDER_NUMBER, phone: PHONE, turnstileToken: 'challenge-token' },
      null,
      '203.0.113.7',
    )).resolves.toMatchObject({ orderNumber: ORDER_NUMBER })
    expect(dependencies.turnstileService.verify).toHaveBeenCalledWith({
      ipAddress: '203.0.113.7',
      token: 'challenge-token',
    })
    expect(dependencies.orderRepository.findRecoveryCandidate).toHaveBeenCalledOnce()
  })

  it('counts an invalid Turnstile challenge and never checks the order', async () => {
    const turnstileService = createTurnstileService()
    vi.mocked(turnstileService.verify).mockResolvedValue('invalid')
    const dependencies = createService(
      createOrderRepository(),
      createRecoveryRepository(),
      createGuestSessionService(),
      undefined,
      turnstileService,
    )
    vi.mocked(dependencies.recoveryRepository.checkLimit).mockResolvedValue({
      captchaRequired: true,
      isBlocked: false,
      retryAfterSeconds: 0,
    })

    await expect(dependencies.service.recover(
      { orderNumber: ORDER_NUMBER, phone: PHONE, turnstileToken: 'invalid-token' },
      null,
      '203.0.113.7',
    )).rejects.toMatchObject({ code: 'HUMAN_VERIFICATION_REQUIRED' })
    expect(dependencies.recoveryRepository.registerFailure).toHaveBeenCalledOnce()
    expect(dependencies.orderRepository.findRecoveryCandidate).not.toHaveBeenCalled()
  })

  it('fails closed without adding an attempt when Turnstile is unavailable', async () => {
    const turnstileService = createTurnstileService()
    vi.mocked(turnstileService.verify).mockResolvedValue('unavailable')
    const dependencies = createService(
      createOrderRepository(),
      createRecoveryRepository(),
      createGuestSessionService(),
      undefined,
      turnstileService,
    )
    vi.mocked(dependencies.recoveryRepository.checkLimit).mockResolvedValue({
      captchaRequired: true,
      isBlocked: false,
      retryAfterSeconds: 0,
    })

    await expect(dependencies.service.recover(
      { orderNumber: ORDER_NUMBER, phone: PHONE, turnstileToken: 'challenge-token' },
      null,
      '203.0.113.7',
    )).rejects.toMatchObject({
      code: 'HUMAN_VERIFICATION_UNAVAILABLE',
      details: { captchaRequired: true },
      statusCode: 503,
    })
    expect(dependencies.recoveryRepository.registerFailure).not.toHaveBeenCalled()
    expect(dependencies.orderRepository.findRecoveryCandidate).not.toHaveBeenCalled()
  })

  it('stops a blocked request before reading any recovery candidate', async () => {
    const dependencies = createService()
    vi.mocked(dependencies.recoveryRepository.checkLimit).mockResolvedValue({
      captchaRequired: true,
      isBlocked: true,
      retryAfterSeconds: 600,
    })

    await expect(dependencies.service.recover(
      { orderNumber: ORDER_NUMBER, phone: PHONE },
      null,
      '203.0.113.7',
    )).rejects.toEqual(new RecoveryBlockedError(600))
    expect(dependencies.orderRepository.findRecoveryCandidate).not.toHaveBeenCalled()
  })

  it('clears failures and atomically rotates the credential after a valid recovery', async () => {
    const dependencies = createService()

    const result = await dependencies.service.recover(
      { orderNumber: ORDER_NUMBER, phone: '+54 9 11 2345-6789' },
      TOKEN,
      '203.0.113.7',
    )

    expect(dependencies.recoveryRepository.clearFailures).toHaveBeenCalledOnce()
    expect(dependencies.guestSessionService.resolve).toHaveBeenCalledWith(TOKEN, false)
    expect(dependencies.guestSessionService.rotateForRecovery).toHaveBeenCalledWith(
      SESSION_ID,
      ORDER_ID,
    )
    expect(result).toMatchObject({ orderNumber: ORDER_NUMBER, sessionToken: TOKEN })
  })

  it('forgets an invalid or absent session idempotently', async () => {
    const dependencies = createService()
    vi.mocked(dependencies.guestSessionService.revokeByToken).mockResolvedValue(false)

    await expect(dependencies.service.forget(null)).resolves.toBeUndefined()
    expect(dependencies.guestSessionService.revokeByToken).toHaveBeenCalledWith(null)
  })

  it('keeps controlled recovery errors as AppError instances', async () => {
    const dependencies = createService()
    vi.mocked(dependencies.orderRepository.findRecoveryCandidate).mockResolvedValue(null)

    await expect(dependencies.service.recover(
      { orderNumber: ORDER_NUMBER, phone: PHONE },
      null,
      '203.0.113.7',
    )).rejects.toBeInstanceOf(AppError)
  })
})
