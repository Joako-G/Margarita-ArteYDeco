import { routes } from '@/config/routes'

import { sanitizeAdminRedirectPath } from './admin-route-path'

export interface IAdminRouteState {
  from?: string
}

export function getAdminRedirectPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return routes.admin
  }

  const from = (state as IAdminRouteState).from

  return sanitizeAdminRedirectPath(from)
}
