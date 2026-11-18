import type { Logger } from 'pino'
import { describe, expect, it, vi } from 'vitest'

import { GuestSessionRepository } from '../repositories/guest-sessions.repository.js'

const logger = { error: vi.fn() } as unknown as Logger

interface Query {
  eq: (...args: unknown[]) => Query
  gt: (...args: unknown[]) => Query
  insert: (...args: unknown[]) => Query
  is: (...args: unknown[]) => Query
  maybeSingle: (...args: unknown[]) => Query
  select: (...args: unknown[]) => Query
  single: (...args: unknown[]) => Query
  then: (resolve: (value: unknown) => unknown) => Promise<unknown>
}

function createQuery(result: unknown): Query {
  const query: Query = {
    eq: vi.fn(() => query),
    gt: vi.fn(() => query),
    insert: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown): Promise<unknown> => Promise.resolve(result).then(resolve),
  }
  return query
}

describe('GuestSessionRepository diagnostics', () => {
  it('logs safe diagnostics for create failures without changing the public error', async () => {
    vi.mocked(logger.error).mockClear()
    const query = createQuery({
      data: null,
      error: { code: '42501', message: 'permission denied for customer phone 1123456789 secret token' },
    })
    const repository = new GuestSessionRepository({ from: vi.fn(() => query) } as never, logger)

    await expect(repository.create('hash', new Date())).rejects.toMatchObject({
      statusCode: 503,
      message: 'No fue posible crear la sesión de compra',
    })
    expect(logger.error).toHaveBeenCalledWith(
      { code: '42501', operation: 'guest_sessions.create' },
      'Guest session Supabase operation failed',
    )
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain('1123456789')
  })

  it.each([
    ['find_active', 'No fue posible validar la sesión de compra'],
    ['touch', 'No fue posible actualizar la sesión de compra'],
    ['recover', 'No fue posible recuperar la sesión de compra'],
  ] as const)('logs the %s failure with its Supabase operation', async (operation, publicMessage) => {
    vi.mocked(logger.error).mockClear()
    const error = { code: 'XX000', message: 'safe diagnostic message' }
    const rpc = vi.fn().mockResolvedValue({ data: null, error })
    const query = createQuery({ data: null, error })
    const client = { from: vi.fn(() => query), rpc }
    const repository = new GuestSessionRepository(client as never, logger)

    const action = operation === 'find_active'
      ? repository.findActiveByTokenHash('hash', new Date())
      : operation === 'touch'
        ? repository.touch('id')
        : repository.recover(null, 'order', 'hash', new Date())

    await expect(action).rejects.toMatchObject({ message: publicMessage })
    const expectedOperation = operation === 'find_active'
      ? 'guest_sessions.find_active'
      : operation === 'touch'
        ? 'touch_guest_session'
        : 'recover_order_guest_session'
    expect(logger.error).toHaveBeenCalledWith(
      { code: 'XX000', message: 'safe diagnostic message', operation: expectedOperation },
      'Guest session Supabase operation failed',
    )
  })
})
