export function getAdminCategoryLifecycleErrorMessage(code: string | null): string {
  switch (code) {
    case 'CATEGORY_HAS_PRODUCTS':
      return 'La categoría tiene productos asociados. Reasignalos antes de eliminarla.'
    case 'CATEGORY_IMAGE_REQUIRED_FOR_PUBLICATION':
      return 'Cargá una imagen antes de mostrar la categoría en la tienda.'
    case 'CATEGORY_UPDATE_CONFLICT':
      return 'La categoría cambió mientras trabajabas. Recargamos el listado para evitar sobrescribir datos.'
    default:
      return 'No pudimos completar la acción. Intentá nuevamente.'
  }
}

export function getAdminCategoryLifecycleSuccessMessage(
  name: string,
  action: 'delete' | 'publication',
  value?: boolean,
): string {
  if (action === 'delete') {
    return `Quitaste “${name}” del catálogo. Su información quedó guardada.`
  }
  return value
    ? `“${name}” ya está visible en la tienda.`
    : `“${name}” quedó oculta y ya no aparece en la tienda.`
}
