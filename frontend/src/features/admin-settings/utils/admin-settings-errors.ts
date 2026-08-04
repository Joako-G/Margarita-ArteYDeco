export function getAdminSettingsErrorMessage(code: string | null): string {
  if (code === 'SETTINGS_UPDATE_CONFLICT') {
    return 'La configuración cambió en otra sesión. Recargá la página antes de continuar.'
  }
  if (code === 'SETTINGS_LOGO_STORAGE_UNAVAILABLE') {
    return 'No pudimos guardar el logo. Intentá nuevamente en unos minutos.'
  }
  if (code === 'SETTINGS_MISSING') {
    return 'La configuración del negocio no está disponible.'
  }
  return 'No pudimos guardar los cambios. Revisá los datos e intentá nuevamente.'
}
