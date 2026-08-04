export function sanitizeAdminRedirectPath(from: unknown): string {
  if (
    typeof from !== 'string' ||
    !from.startsWith('/admin') ||
    from.startsWith('//') ||
    from === '/admin/login'
  ) {
    return '/admin'
  }

  return from
}
