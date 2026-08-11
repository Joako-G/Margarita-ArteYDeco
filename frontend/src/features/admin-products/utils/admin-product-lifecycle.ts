import type { AdminProductLifecycleActionType } from '../types/admin-products'

export function getAdminProductLifecycleSuccessMessage(
  productName: string,
  action: AdminProductLifecycleActionType,
  value?: boolean,
): string {
  switch (action) {
    case 'publication':
      return value
        ? `“${productName}” ya está visible en la tienda.`
        : `“${productName}” quedó oculto y ya no puede agregarse a nuevos pedidos.`
    case 'featured':
      return value
        ? `“${productName}” ahora aparece entre los recomendados.`
        : `“${productName}” ya no aparece entre los recomendados.`
    case 'delete':
      return `Quitaste “${productName}” del catálogo. Su información y su historial quedaron guardados.`
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
