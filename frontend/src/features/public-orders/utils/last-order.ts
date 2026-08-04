const LAST_ORDER_NUMBER_KEY = 'lastOrderNumber'
const ORDER_NUMBER_PATTERN = /^MAD-[0-9]{8}-[0-9]{6,}$/

export function getLastOrderNumber(): string | null {
  try {
    const value = window.localStorage.getItem(LAST_ORDER_NUMBER_KEY)

    return value !== null && ORDER_NUMBER_PATTERN.test(value) ? value : null
  } catch {
    return null
  }
}

export function setLastOrderNumber(orderNumber: string): void {
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) return

  try {
    window.localStorage.setItem(LAST_ORDER_NUMBER_KEY, orderNumber)
  } catch {
    // The hint is optional; the Backend session remains the source of truth.
  }
}

export function clearLastOrderNumber(): void {
  try {
    window.localStorage.removeItem(LAST_ORDER_NUMBER_KEY)
  } catch {
    // The server-side session is revoked even when local storage is unavailable.
  }
}

export function normalizeOrderNumber(value: string): string {
  return value.trim().toUpperCase()
}

export function isValidOrderNumber(value: string): boolean {
  return ORDER_NUMBER_PATTERN.test(normalizeOrderNumber(value))
}
