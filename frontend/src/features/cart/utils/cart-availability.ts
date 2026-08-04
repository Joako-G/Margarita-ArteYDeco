import type { IProduct } from '@/shared/types/catalog'

import type { ICartAvailabilityChange, ICartItem } from '../types/cart'

export interface ICartReconciliationResult {
  changes: ICartAvailabilityChange[]
  items: ICartItem[]
}

function createCartItem(product: IProduct, quantity: number): ICartItem {
  return {
    ...product,
    quantity,
  }
}

export function reconcileCartItems(
  items: ICartItem[],
  products: IProduct[],
): ICartReconciliationResult {
  const productsById = new Map(products.map((product) => [product.id, product]))
  const changes: ICartAvailabilityChange[] = []
  const nextItems = items.flatMap((item) => {
    const currentProduct = productsById.get(item.id)

    if (!currentProduct || !currentProduct.isActive) {
      changes.push({
        currentQuantity: 0,
        previousQuantity: item.quantity,
        productId: item.id,
        productName: item.name,
        reason: 'unavailable',
      })
      return []
    }

    if (currentProduct.stockQuantity === 0) {
      changes.push({
        currentQuantity: 0,
        previousQuantity: item.quantity,
        productId: item.id,
        productName: currentProduct.name,
        reason: 'out_of_stock',
      })
      return []
    }

    const normalizedQuantity = Number.isFinite(item.quantity) ? Math.trunc(item.quantity) : 1
    const nextQuantity = Math.min(Math.max(normalizedQuantity, 1), currentProduct.stockQuantity)

    if (nextQuantity !== item.quantity) {
      changes.push({
        currentQuantity: nextQuantity,
        previousQuantity: item.quantity,
        productId: item.id,
        productName: currentProduct.name,
        reason: item.quantity > currentProduct.stockQuantity ? 'stock_reduced' : 'invalid_quantity',
      })
    }

    return [createCartItem(currentProduct, nextQuantity)]
  })

  return { changes, items: nextItems }
}

export function getCartAvailabilityChangeMessage(change: ICartAvailabilityChange) {
  if (change.reason === 'out_of_stock') {
    return `${change.productName} quedó sin stock y se quitó del carrito.`
  }

  if (change.reason === 'unavailable') {
    return `${change.productName} dejó de estar disponible y se quitó del carrito.`
  }

  if (change.reason === 'stock_reduced') {
    const unitLabel = change.currentQuantity === 1 ? 'unidad disponible' : 'unidades disponibles'

    return `La cantidad de ${change.productName} se ajustó a ${change.currentQuantity} ${unitLabel}.`
  }

  return `Corregimos la cantidad de ${change.productName} a ${change.currentQuantity}.`
}
