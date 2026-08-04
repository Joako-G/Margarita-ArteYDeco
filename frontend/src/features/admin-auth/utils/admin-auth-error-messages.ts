export function mapAdminAuthError(code: string | null, status: number | null): string {
  if (code === 'INVALID_ADMIN_CREDENTIALS') {
    return 'El correo o la contraseña no son correctos.'
  }

  if (code === 'ADMIN_LOGIN_RATE_LIMIT_EXCEEDED' || status === 429) {
    return 'Se alcanzó el límite de intentos. Esperá unos minutos antes de volver a probar.'
  }

  if (code === 'ADMIN_AUTH_UNAVAILABLE' || status === null || status >= 500) {
    return 'No pudimos conectar con el servicio administrativo. Intentá nuevamente en unos minutos.'
  }

  return 'No pudimos iniciar sesión. Revisá los datos e intentá nuevamente.'
}
