import { getApiErrorCode, getApiErrorStatus } from '@/shared/services/api/errors'

import { mapAdminAuthError } from './admin-auth-error-messages'

export { mapAdminAuthError } from './admin-auth-error-messages'

export function getAdminAuthErrorMessage(error: unknown): string {
  return mapAdminAuthError(getApiErrorCode(error), getApiErrorStatus(error))
}
