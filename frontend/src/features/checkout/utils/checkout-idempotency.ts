export function getOrCreateCheckoutAttemptKey(
  currentKey: string | null,
  createKey: () => string = () => crypto.randomUUID(),
): string {
  return currentKey ?? createKey()
}
