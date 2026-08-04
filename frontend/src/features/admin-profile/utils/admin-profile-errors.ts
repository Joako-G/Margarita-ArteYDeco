import { getApiErrorCode } from '@/shared/services/api/errors'

const ERROR_MESSAGES: Record<string, string> = {
  ADMIN_EMAIL_UNAVAILABLE: 'Ese correo ya está en uso o no está disponible.',
  ADMIN_EMAIL_UNCHANGED: 'Ingresá un correo diferente al actual.',
  ADMIN_PASSWORD_UNCHANGED: 'La nueva contraseña debe ser diferente a la actual.',
  ADMIN_PASSWORD_WEAK: 'La contraseña no cumple los requisitos de seguridad.',
  ADMIN_PROFILE_AUTH_UNAVAILABLE: 'No pudimos actualizar las credenciales. Intentá nuevamente.',
  ADMIN_PROFILE_RATE_LIMITED: 'Esperá unos minutos antes de intentarlo nuevamente.',
  ADMIN_PROFILE_UPDATE_CONFLICT: 'El perfil cambió en otra sesión. Recargamos los datos para que puedas intentarlo otra vez.',
  INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.',
}

export function getAdminProfileErrorMessage(error: unknown): string {
  const code = getApiErrorCode(error)
  return code && ERROR_MESSAGES[code]
    ? ERROR_MESSAGES[code]
    : 'No pudimos guardar el cambio. Intentá nuevamente.'
}
