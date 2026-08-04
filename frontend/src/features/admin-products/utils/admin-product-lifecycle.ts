import type { AdminProductLifecycleActionType } from '../types/admin-products'

export function getAdminProductLifecycleSuccessMessage(
  productName: string,
  action: AdminProductLifecycleActionType,
  value?: boolean,
): string {
  switch (action) {
    case 'publication':
      return `“${productName}” ahora está ${value ? 'activo' : 'inactivo'}.`
    case 'featured':
      return value
        ? `“${productName}” se agregó a destacados.`
        : `“${productName}” se quitó de destacados.`
    case 'delete':
      return `“${productName}” se eliminó del catálogo.`
  }
}

export function getAdminProductLifecycleErrorMessage(errorCode: string | null): string {
  switch (errorCode) {
    case 'PRODUCT_CATEGORY_INACTIVE':
      return 'Activá la categoría del producto antes de publicarlo.'
    case 'PRODUCT_UPDATE_CONFLICT':
      return 'El producto cambió en otra sesión. Actualizamos el listado para que vuelvas a intentar.'
    default:
      return 'No pudimos guardar el cambio. Intentá nuevamente.'
  }
}
